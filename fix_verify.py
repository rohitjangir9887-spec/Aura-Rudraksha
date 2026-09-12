import re

with open("server/controllers/paymentController.js", "r") as f:
    content = f.read()

# We want to replace the logic inside: if (order.paymentStatus !== "Paid" && order.txnid) { ... }
# Let's locate that block.

start_str = """    // If order is pending and has a transaction ID, perform live PayU server-to-server check
    if (order.paymentStatus !== "Paid" && order.txnid) {"""

end_str = """        }
      }
    }

    const currentOrder = await Order.findById(order._id);"""

start_idx = content.find(start_str)
end_idx = content.find(end_str) + len(end_str)

if start_idx == -1 or end_idx == -1:
    print("Could not find block!")
    exit(1)

new_block = """    // If order is pending, perform live PayU server-to-server check for all pending attempts
    if (order.paymentStatus !== "Paid" && (order.txnid || (order.paymentAttempts && order.paymentAttempts.length > 0))) {
      const { isConfigured } = getPayuConfig();
      if (isConfigured) {
        let isAnyAttemptPaid = false;
        let successfulTxnid = "";
        let finalVerifyRes = null;
        let finalExpectedAmount = 0;

        const attemptsToCheck = order.paymentAttempts && order.paymentAttempts.length > 0 
          ? [...order.paymentAttempts]
          : [{ txnid: order.txnid }];

        if (reqTxnid) {
          const matchingAttempt = attemptsToCheck.find(a => a.txnid === reqTxnid);
          if (matchingAttempt) {
            attemptsToCheck.splice(attemptsToCheck.indexOf(matchingAttempt), 1);
            attemptsToCheck.unshift(matchingAttempt);
          } else {
            attemptsToCheck.unshift({ txnid: reqTxnid });
          }
        }

        for (const attempt of attemptsToCheck) {
          if (!attempt.txnid || attempt.status === "success") continue;
          const verifyRes = await verifyPayuPaymentServerSide(attempt.txnid);
          const expectedAmount = Number(order.finalAmount || order.total || order.amount || 0);

          if (verifyRes.success && verifyRes.isPaid && Math.abs(verifyRes.amount - expectedAmount) < 0.01) {
            isAnyAttemptPaid = true;
            successfulTxnid = attempt.txnid;
            finalVerifyRes = verifyRes;
            finalExpectedAmount = expectedAmount;
            break;
          }
        }

        if (isAnyAttemptPaid) {
          const verifyRes = finalVerifyRes;
          const updatedOrder = await Order.findOneAndUpdate(
            { _id: order._id, paymentStatus: { $ne: "Paid" } },
            {
              $set: {
                paymentStatus: "Paid",
                orderStatus: "Confirmed",
                status: "Confirmed",
                txnid: successfulTxnid,
                mihpayid: verifyRes.mihpayid || order.mihpayid,
                bankRefNum: verifyRes.bankRefNum || order.bankRefNum,
                paymentMode: verifyRes.mode || order.paymentMode,
                payuStatus: "Success",
                unmappedstatus: verifyRes.unmappedStatus || "captured",
                paymentDetails: sanitizePaymentDetails({
                  ...order.paymentDetails,
                  ...verifyRes.txnDetails,
                  verifiedAt: new Date().toISOString(),
                  verifiedBy: "on_demand_server_verify"
                })
              }
            },
            { new: true }
          );

          if (updatedOrder) {
            const attempts = order.paymentAttempts || [];
            const attemptIdx = attempts.findIndex(a => a.txnid === successfulTxnid);
            if (attemptIdx >= 0) {
              attempts[attemptIdx].status = "success";
              attempts[attemptIdx].mihpayid = verifyRes.mihpayid || attempts[attemptIdx].mihpayid || "";
              attempts[attemptIdx].bankRefNum = verifyRes.bankRefNum || attempts[attemptIdx].bankRefNum || "";
              attempts[attemptIdx].paymentMode = verifyRes.mode || attempts[attemptIdx].paymentMode || "";
              attempts[attemptIdx].updatedAt = new Date().toISOString();
            } else if (successfulTxnid) {
              attempts.push({
                txnid: successfulTxnid,
                amount: finalExpectedAmount,
                status: "success",
                mihpayid: verifyRes.mihpayid || "",
                bankRefNum: verifyRes.bankRefNum || "",
                paymentMode: verifyRes.mode || "",
                createdAt: new Date().toISOString()
              });
            }
            await Order.updateOne({ _id: order._id }, { $set: { paymentAttempts: attempts } });

            const stockClaim = await Order.findOneAndUpdate(
              { _id: order._id, inventoryDeducted: { $ne: true } },
              { $set: { inventoryDeducted: true } },
              { new: false }
            );

            if (stockClaim && !stockClaim.inventoryDeducted && order.snapshotItems && Array.isArray(order.snapshotItems)) {
              const bulkOps = [];
              for (const item of order.snapshotItems) {
                if (item.id) {
                  const qty = Math.max(1, item.qty || item.quantity || 1);
                  bulkOps.push({
                    updateOne: {
                      filter: { id: item.id, stock: { $gte: qty } },
                      update: { $inc: { stock: -qty } }
                    }
                  });
                }
              }
              if (bulkOps.length > 0) {
                await Product.bulkWrite(bulkOps);
              }
            }

            if (order.couponCode) {
              const couponClaim = await Order.findOneAndUpdate(
                { _id: order._id, couponUsedRecorded: { $ne: true } },
                { $set: { couponUsedRecorded: true } },
                { new: false }
              );
              if (couponClaim && !couponClaim.couponUsedRecorded) {
                await Coupon.findOneAndUpdate({ code: order.couponCode.toUpperCase() }, { $inc: { usage: 1 } });
              }
            }
          }
        } else if (order.txnid) {
          const txnidToSync = reqTxnid && order.paymentAttempts && order.paymentAttempts.some(a => a.txnid === reqTxnid) ? reqTxnid : order.txnid;
          const verifyRes = await verifyPayuPaymentServerSide(txnidToSync);
          const expectedAmount = Number(order.finalAmount || order.total || order.amount || 0);
          
          if (verifyRes.success) {
            const rawStatus = (verifyRes.status || "").toLowerCase();
            const unmapped = (verifyRes.unmappedStatus || "").toLowerCase();
            let newPayuStatus = verifyRes.status || verifyRes.unmappedStatus || "Failed";
            
            if (rawStatus === "bounced" || unmapped === "bounced") newPayuStatus = "Bounced";
            else if (rawStatus === "usercancelled" || unmapped === "usercancelled") newPayuStatus = "userCancelled";
            else if (rawStatus === "dropped" || unmapped === "dropped") newPayuStatus = "Dropped";
            else if (rawStatus === "failed" || rawStatus === "failure" || unmapped === "failed") newPayuStatus = "Failed";

            let newPaymentStatus = "Failed";
            if (rawStatus === "usercancelled" || unmapped === "usercancelled") {
              newPaymentStatus = "Cancelled";
            } else if (rawStatus === "pending" || rawStatus === "initiated" || unmapped === "initiated") {
              newPaymentStatus = "Pending";
            }

            const attempts = order.paymentAttempts || [];
            const attemptIdx = attempts.findIndex(a => a.txnid === txnidToSync);
            
            if (attemptIdx >= 0) {
              attempts[attemptIdx].mihpayid = verifyRes.mihpayid || attempts[attemptIdx].mihpayid || "";
              attempts[attemptIdx].payuStatus = newPayuStatus;
              attempts[attemptIdx].unmappedstatus = verifyRes.unmappedStatus || "";
              attempts[attemptIdx].paymentStatus = newPaymentStatus;
              attempts[attemptIdx].bankRefNum = verifyRes.bankRefNum || attempts[attemptIdx].bankRefNum || "";
              attempts[attemptIdx].paymentMode = verifyRes.mode || attempts[attemptIdx].paymentMode || "";
              attempts[attemptIdx].updatedAt = new Date().toISOString();
            }

            await Order.updateOne(
              { _id: order._id },
              {
                $set: {
                  paymentStatus: order.paymentStatus === "Paid" ? "Paid" : newPaymentStatus,
                  payuStatus: newPayuStatus,
                  unmappedstatus: verifyRes.unmappedStatus || "",
                  mihpayid: verifyRes.mihpayid || order.mihpayid || "",
                  bankRefNum: verifyRes.bankRefNum || order.bankRefNum || "",
                  paymentMode: verifyRes.mode || order.paymentMode || "",
                  paymentAttempts: attempts
                }
              }
            );
          }
        }
      }
    }

    const currentOrder = await Order.findById(order._id);"""

with open("server/controllers/paymentController.js", "w") as f:
    f.write(content[:start_idx] + new_block + content[end_idx:])

print("Successfully updated paymentController.js")
