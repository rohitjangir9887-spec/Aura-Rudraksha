import React from "react";

export function NetBankingPayment({
  selectedBank,
  setSelectedBank,
  popularBanks
}) {
  return (
    <div>
      <div style={{ fontSize: "15px", fontWeight: "700", color: "#2b170d", marginBottom: "6px" }}>
        Popular Indian Banks
      </div>
      <div style={{ fontSize: "12px", color: "#6e5d50", marginBottom: "12px" }}>
        Connect directly through PayU secure banking servers:
      </div>

      {/* Popular Banks Selector Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "8px", marginBottom: "14px" }}>
        {popularBanks.map((bank) => {
          const isSel = selectedBank === bank.code;
          return (
            <div
              key={bank.code}
              onClick={() => setSelectedBank(bank.code)}
              style={{
                padding: "10px 8px",
                borderRadius: "10px",
                border: isSel ? "2px solid #b88a58" : "1px solid #ebd9c8",
                background: isSel ? "#fbf6f0" : "#ffffff",
                textAlign: "center",
                cursor: "pointer",
                boxShadow: isSel ? "0 2px 6px rgba(184, 138, 88, 0.15)" : "none"
              }}
            >
              <div style={{ fontSize: "20px", marginBottom: "4px" }}>{bank.logo}</div>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#2b170d" }}>{bank.name}</div>
              {isSel && <div style={{ fontSize: "9px", color: "#166534", fontWeight: "800", marginTop: "2px" }}>SELECTED</div>}
            </div>
          );
        })}
      </div>

      {/* All Other Banks Dropdown */}
      <div>
        <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#4a3528", marginBottom: "4px" }}>
          Or Choose Other Bank (50+ Banks Supported)
        </label>
        <select
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #d4c5b9",
            background: "#ffffff",
            fontSize: "13px",
            color: "#2b170d",
            outline: "none"
          }}
          value={selectedBank}
          onChange={(e) => setSelectedBank(e.target.value)}
        >
          <option value="HDFC">HDFC Bank</option>
          <option value="SBI">State Bank of India</option>
          <option value="ICICI">ICICI Bank</option>
          <option value="AXIS">Axis Bank</option>
          <option value="KOTAK">Kotak Mahindra Bank</option>
          <option value="PNB">Punjab National Bank</option>
          <option value="BOB">Bank of Baroda</option>
          <option value="CANARA">Canara Bank</option>
          <option value="IDBI">IDBI Bank</option>
          <option value="YES">Yes Bank</option>
          <option value="INDUSIND">IndusInd Bank</option>
          <option value="UNION">Union Bank of India</option>
        </select>
      </div>
    </div>
  );
}
