## 2025-02-12 - Missing type='button' in TopOfferStrip
**Learning:** The copy coupon button in TopOfferStrip was missing the `type="button"` attribute. Without this, the button could accidentally trigger form submissions if placed inside a form element.
**Action:** Always ensure that buttons not intended to submit a form have `type="button"` explicitly set to prevent unintended form submissions.
