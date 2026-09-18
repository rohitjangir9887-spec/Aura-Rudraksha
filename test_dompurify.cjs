const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

let formattedHtml = `<div class="desc-bullet-row"><span class="desc-bullet-dot">•</span><span>test <script>alert(1)</script> <strong>bold</strong></span></div>`;

const cleanFormattedHtml = DOMPurify.sanitize(formattedHtml, {
  ALLOWED_TAGS: ['p', 'div', 'span', 'strong'],
  ALLOWED_ATTR: ['class', 'style']
});

console.log(cleanFormattedHtml);
