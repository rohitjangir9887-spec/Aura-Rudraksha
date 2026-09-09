with open("server/services/seoService.js", "r") as f:
    code = f.read()

target = """export const SEO_BRAND = {
  name: "Aura Rudraksha",
  legalName: "Aura Rudraksha Enterprises",
  logo: "https://aura-rudraksha.vercel.app/logo-header-horizontal.png",
  defaultImage: "https://aura-rudraksha.vercel.app/og-image.jpg","""

replacement = """export const SEO_BRAND = {
  name: "Aura Rudraksha",
  legalName: "Aura Rudraksha Enterprises",
  logo: "/logo-header-horizontal.png",
  defaultImage: "/og-image.jpg","""

code = code.replace(target, replacement)

with open("server/services/seoService.js", "w") as f:
    f.write(code)
