/**
 * Export Product Catalog to XLSX and PDF formats
 */
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { emitToast } from "../context/ToastContext";

/**
 * Format currency in INR
 */
function formatInr(num) {
  if (num === null || num === undefined || isNaN(num)) return "₹0";
  return `₹${Number(num).toLocaleString("en-IN")}`;
}

/**
 * Strip HTML tags from description for clean sheet/PDF output
 */
function stripHtml(html) {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clean keyword list
 */
function extractKeywords(p) {
  const kws = Array.isArray(p.keywords) ? p.keywords : (Array.isArray(p.searchKeywords) ? p.searchKeywords : []);
  return kws
    .map(k => (typeof k === "string" ? k : (k && k.term ? k.term : (k && k.keyword ? k.keyword : ""))))
    .filter(Boolean)
    .join(", ");
}

/**
 * Export all products as an Excel XLSX spreadsheet
 */
export function exportProductsToXLSX(products = [], filename = "Aura_Rudraksha_Product_Catalog.xlsx") {
  if (!Array.isArray(products) || products.length === 0) {
    emitToast("No products to export", "error");
    return;
  }

  try {
    const rows = products.map((p, idx) => {
      const salesCount = Number(p.salesCount ?? p.timesPurchased) || 
        (p.totalSold ? parseInt(String(p.totalSold).replace(/\D/g, ""), 10) || 0 : 0);
      
      const isDraft = p.status === "Draft" || p.status === "draft" || p.status === "Inactive" || p.status === "inactive";
      const statusText = isDraft ? "Draft" : "Published";

      // Sizes summary if enabled
      let sizesSummary = "";
      if (p.hasSizes && Array.isArray(p.sizes) && p.sizes.length > 0) {
        sizesSummary = p.sizes
          .map(s => `${s.name}${s.price ? ` (${formatInr(s.price)})` : ""}${s.isDefault ? " [Default]" : ""}`)
          .join(" | ");
      }

      // Variants summary
      let variantsSummary = "";
      if (Array.isArray(p.variants) && p.variants.length > 0) {
        variantsSummary = p.variants
          .map(v => `${v.name || v.label || ""}${v.price ? ` (${formatInr(v.price)})` : ""}`)
          .join(" | ");
      }

      // Image links
      const allImgs = Array.isArray(p.images) && p.images.length > 0 ? p.images.join(", ") : (p.img || p.image || "");

      return {
        "S.No": idx + 1,
        "Product ID": p.id || p._id || "",
        "Product Name": p.name || "",
        "Category": p.category || "Rudraksha",
        "Sub Category": p.subCategory || "",
        "Mukhi": p.mukhi || "",
        "Origin": p.origin || "Nepal",
        "Selling Price (₹)": Number(p.price) || 0,
        "MRP (₹)": Number(p.mrp) || Number(p.price) || 0,
        "Discount (%)": p.discountPercent || (p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0),
        "Stock": Number(p.stock) || 0,
        "Status": statusText,
        "Home Showcase": p.showOnHome !== false ? "Visible" : "Hidden",
        "Home Order": p.homeOrder !== undefined ? p.homeOrder : 0,
        "Total Sold": salesCount,
        "Delivery Fee (₹)": p.freeShipping === false ? Number(p.shippingFee || 0) : 0,
        "Free Shipping": p.freeShipping !== false ? "Yes" : "No",
        "Lab Certified": p.hasCertificate ? "Yes" : "No",
        "Ruling Planet": p.rulingPlanet || "",
        "Ruling Deity": p.deity || "",
        "Zodiac Signs": Array.isArray(p.zodiac) ? p.zodiac.join(", ") : (p.zodiac || ""),
        "Badge / Label": p.badge || "",
        "Size Variants": sizesSummary || "N/A",
        "Design Variants": variantsSummary || "N/A",
        "Search Keywords": extractKeywords(p),
        "Images Count": Array.isArray(p.images) ? p.images.length : (p.img ? 1 : 0),
        "Primary Image URL": p.img || (Array.isArray(p.images) ? p.images[0] : ""),
        "All Image URLs": allImgs,
        "Short Description": p.highlight || p.shortDesc || "",
        "Full Description": stripHtml(p.description || "")
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    worksheet["!cols"] = [
      { wch: 6 },  // S.No
      { wch: 20 }, // Product ID
      { wch: 40 }, // Product Name
      { wch: 18 }, // Category
      { wch: 18 }, // Sub Category
      { wch: 12 }, // Mukhi
      { wch: 12 }, // Origin
      { wch: 16 }, // Selling Price
      { wch: 12 }, // MRP
      { wch: 12 }, // Discount
      { wch: 10 }, // Stock
      { wch: 12 }, // Status
      { wch: 14 }, // Home Showcase
      { wch: 10 }, // Home Order
      { wch: 12 }, // Total Sold
      { wch: 14 }, // Delivery Fee
      { wch: 12 }, // Free Shipping
      { wch: 12 }, // Lab Certified
      { wch: 16 }, // Ruling Planet
      { wch: 18 }, // Ruling Deity
      { wch: 20 }, // Zodiac Signs
      { wch: 16 }, // Badge
      { wch: 25 }, // Size Variants
      { wch: 25 }, // Design Variants
      { wch: 30 }, // Search Keywords
      { wch: 12 }, // Images Count
      { wch: 40 }, // Primary Image
      { wch: 40 }, // All Images
      { wch: 35 }, // Short Description
      { wch: 50 }, // Full Description
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products Catalog");

    // Write file and trigger download
    XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
    emitToast(`✅ Exported ${products.length} products to XLSX Excel successfully!`, "success");
  } catch (err) {
    console.error("XLSX export error:", err);
    emitToast(`Failed to export Excel file: ${err.message}`, "error");
  }
}

/**
 * Export all products as an organized, print-ready PDF catalog
 */
export function exportProductsToPDF(products = [], filename = "Aura_Rudraksha_Product_Catalog.pdf") {
  if (!Array.isArray(products) || products.length === 0) {
    emitToast("No products to export", "error");
    return;
  }

  try {
    // Landscape A4 for rich catalog view
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4"
    });

    const totalProducts = products.length;
    const now = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    // Header styling
    doc.setFillColor(43, 23, 13); // #2b170d Deep sacred bronze
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 65, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("AURA RUDRAKSHA - OFFICIAL PRODUCT CATALOG", 40, 32);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(254, 215, 170); // #fed7aa
    doc.text(`Generated on: ${now} | Total Products: ${totalProducts} | Web: https://aurarudraksha.bond`, 40, 50);

    // Prepare table data
    const tableBody = products.map((p, idx) => {
      const isDraft = p.status === "Draft" || p.status === "draft" || p.status === "Inactive" || p.status === "inactive";
      const status = isDraft ? "Draft" : "Published";
      const price = formatInr(p.price);
      const mrp = p.mrp > p.price ? formatInr(p.mrp) : "-";
      const stock = `${p.stock || 0} units`;
      const cat = [p.category || "Rudraksha", p.mukhi ? `(${p.mukhi})` : ""].filter(Boolean).join(" ");
      const origin = p.origin ? (p.hasIndonesianVariant ? "Nepal+Java" : p.origin) : "Nepal";
      const home = p.showOnHome !== false ? "Yes" : "No";

      return [
        String(idx + 1),
        p.name || "Untitled Product",
        cat,
        origin,
        price,
        mrp,
        stock,
        status,
        home
      ];
    });

    // AutoTable layout
    autoTable(doc, {
      startY: 75,
      head: [
        ["#", "Product Name", "Category / Mukhi", "Origin", "Price", "MRP", "Stock", "Status", "Home"]
      ],
      body: tableBody,
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 6,
        valign: "middle",
        overflow: "linebreak",
        textColor: [43, 23, 13]
      },
      headStyles: {
        fillColor: [126, 45, 18], // #7e2d12 Sacred Terracotta
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9.5
      },
      alternateRowStyles: {
        fillColor: [253, 250, 246] // #fdfaf6 Subtle cream
      },
      columnStyles: {
        0: { cellWidth: 25, halign: "center" },
        1: { cellWidth: 260 }, // Name
        2: { cellWidth: 120 }, // Category
        3: { cellWidth: 70, halign: "center" }, // Origin
        4: { cellWidth: 65, halign: "right", fontStyle: "bold", textColor: [154, 52, 18] }, // Price
        5: { cellWidth: 60, halign: "right" }, // MRP
        6: { cellWidth: 55, halign: "center" }, // Stock
        7: { cellWidth: 60, halign: "center" }, // Status
        8: { cellWidth: 45, halign: "center" }  // Home
      },
      margin: { left: 40, right: 40, bottom: 40 },
      didDrawPage: (data) => {
        // Footer on every page
        const pageCount = doc.internal.getNumberOfPages();
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height || pageSize.getHeight();
        const pageWidth = pageSize.width || pageSize.getWidth();

        doc.setFontSize(8);
        doc.setTextColor(140, 125, 114);
        doc.text(
          `Aura Rudraksha Official Catalog - Confidential - Page ${data.pageNumber} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 15,
          { align: "center" }
        );
      }
    });

    // Save PDF
    doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
    emitToast(`✅ Exported ${products.length} products to PDF Catalog successfully!`, "success");
  } catch (err) {
    console.error("PDF export error:", err);
    emitToast(`Failed to export PDF catalog: ${err.message}`, "error");
  }
}
