with open("server/services/seoService.js", "r") as f:
    code = f.read()

code = code.replace(
    'import { getSiteBaseUrl } from "./indexNowService.js";\\nimport { inMemoryStore } from "../data/inMemoryStore.js"; from "./indexNowService.js";',
    'import { getSiteBaseUrl } from "./indexNowService.js";\\nimport { inMemoryStore } from "../data/inMemoryStore.js";'
)

with open("server/services/seoService.js", "w") as f:
    f.write(code)
