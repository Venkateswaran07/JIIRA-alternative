# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> I-TRACK browser smoke coverage >> login form exposes labeled fields and responsive layout
- Location: tests\smoke.spec.ts:12:3

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -   1
+ Received  + 326

- Array []
+ Array [
+   Object {
+     "description": "Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds",
+     "help": "Elements must meet minimum color contrast ratio thresholds",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.12/color-contrast?application=playwright",
+     "id": "color-contrast",
+     "impact": "serious",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#a47bef",
+               "contrastRatio": 3.15,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#ffffff",
+               "fontSize": "9.0pt (12px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.15 (foreground color: #ffffff, background color: #a47bef, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<button class=\"btn primary wide\">Sign in</button>",
+                 "target": Array [
+                   ".primary",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.15 (foreground color: #ffffff, background color: #a47bef, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<button class=\"btn primary wide\">Sign in</button>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".primary",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.color",
+       "wcag2aa",
+       "wcag143",
+       "TTv5",
+       "TT13.c",
+       "EN-301-549",
+       "EN-9.1.4.3",
+       "ACT",
+       "RGAAv4",
+       "RGAA-3.2.1",
+     ],
+   },
+   Object {
+     "description": "Ensure the document has a main landmark",
+     "help": "Document should have one main landmark",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.12/landmark-one-main?application=playwright",
+     "id": "landmark-one-main",
+     "impact": "moderate",
+     "nodes": Array [
+       Object {
+         "all": Array [
+           Object {
+             "data": null,
+             "id": "page-has-main",
+             "impact": "moderate",
+             "message": "Document does not have a main landmark",
+             "relatedNodes": Array [],
+           },
+         ],
+         "any": Array [],
+         "failureSummary": "Fix all of the following:
+   Document does not have a main landmark",
+         "html": "<html lang=\"en\" data-density=\"comfortable\" data-theme=\"light\">",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           "html",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.semantics",
+       "best-practice",
+     ],
+   },
+   Object {
+     "description": "Ensure all page content is contained by landmarks",
+     "help": "All page content should be contained by landmarks",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.12/region?application=playwright",
+     "id": "region",
+     "impact": "moderate",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "isIframe": false,
+             },
+             "id": "region",
+             "impact": "moderate",
+             "message": "Some page content is not contained by landmarks",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Some page content is not contained by landmarks",
+         "html": "<section class=\"auth-brand\">",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           ".auth-brand",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "isIframe": false,
+             },
+             "id": "region",
+             "impact": "moderate",
+             "message": "Some page content is not contained by landmarks",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Some page content is not contained by landmarks",
+         "html": "<span class=\"eyebrow\">I-TRACK WORKSPACE</span>",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           ".eyebrow",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "isIframe": false,
+             },
+             "id": "region",
+             "impact": "moderate",
+             "message": "Some page content is not contained by landmarks",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Some page content is not contained by landmarks",
+         "html": "<h1>Welcome back</h1>",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           "form > h1",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "isIframe": false,
+             },
+             "id": "region",
+             "impact": "moderate",
+             "message": "Some page content is not contained by landmarks",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Some page content is not contained by landmarks",
+         "html": "<p>Sign in to load your workspace data.</p>",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           "form > p:nth-child(3)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "isIframe": false,
+             },
+             "id": "region",
+             "impact": "moderate",
+             "message": "Some page content is not contained by landmarks",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Some page content is not contained by landmarks",
+         "html": "<label class=\"field\"><span>Email address</span><input required=\"\" type=\"email\" name=\"email\"></label>",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           "label:nth-child(4)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "isIframe": false,
+             },
+             "id": "region",
+             "impact": "moderate",
+             "message": "Some page content is not contained by landmarks",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Some page content is not contained by landmarks",
+         "html": "<span>Password</span>",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           "label:nth-child(5) > span",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "isIframe": false,
+             },
+             "id": "region",
+             "impact": "moderate",
+             "message": "Some page content is not contained by landmarks",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Some page content is not contained by landmarks",
+         "html": "<input minlength=\"8\" required=\"\" type=\"password\" name=\"password\">",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           "input[minlength=\"8\"]",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "isIframe": false,
+             },
+             "id": "region",
+             "impact": "moderate",
+             "message": "Some page content is not contained by landmarks",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Some page content is not contained by landmarks",
+         "html": "<div class=\"auth-divider\"><span>or</span></div>",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           ".auth-divider",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "isIframe": false,
+             },
+             "id": "region",
+             "impact": "moderate",
+             "message": "Some page content is not contained by landmarks",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Some page content is not contained by landmarks",
+         "html": "<a class=\"btn wide google-auth-button\" href=\"/api/v1/auth/google\"><span class=\"google-mark\" aria-hidden=\"true\">G</span>Continue with Google</a>",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           ".google-auth-button",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "isIframe": false,
+             },
+             "id": "region",
+             "impact": "moderate",
+             "message": "Some page content is not contained by landmarks",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Some page content is not contained by landmarks",
+         "html": "<p class=\"auth-switch\"><a class=\"\" href=\"/forgot-password\" data-discover=\"true\">Forgot password?</a> · <a class=\"\" href=\"/register\" data-discover=\"true\">Create account</a></p>",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           ".auth-switch",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.keyboard",
+       "best-practice",
+       "RGAAv4",
+       "RGAA-9.2.1",
+     ],
+   },
+ ]
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e7]: I-TRACK
    - generic [ref=e8]:
      - generic [ref=e9]:
        - img [ref=e10]
        - text: EXPLAINABLE DELIVERY INTELLIGENCE
      - heading "Build momentum. See risk sooner." [level=1] [ref=e13]:
        - text: Build momentum.
        - text: See risk sooner.
      - paragraph [ref=e14]: Plan focused work, protect capacity, and turn delivery signals into confident decisions.
    - paragraph [ref=e16]: Live workspace data, secured by your organization account.
  - generic [ref=e18]:
    - generic [ref=e19]: I-TRACK WORKSPACE
    - heading "Welcome back" [level=1] [ref=e20]
    - paragraph [ref=e21]: Sign in to load your workspace data.
    - generic [ref=e22]:
      - generic [ref=e23]: Email address
      - textbox "Email address" [ref=e24]
    - generic [ref=e25]:
      - generic [ref=e26]: Password
      - generic [ref=e27]:
        - textbox "Password Show password" [ref=e28]
        - button "Show password" [ref=e29] [cursor=pointer]:
          - img [ref=e30]
    - button "Sign in" [ref=e33] [cursor=pointer]
    - generic [ref=e35]: or
    - link "Continue with Google" [ref=e36] [cursor=pointer]:
      - /url: /api/v1/auth/google
      - generic [ref=e37]: G
      - text: Continue with Google
    - paragraph [ref=e38]:
      - link "Forgot password?" [ref=e39] [cursor=pointer]:
        - /url: /forgot-password
      - text: ·
      - link "Create account" [ref=e40] [cursor=pointer]:
        - /url: /register
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import AxeBuilder from "@axe-core/playwright";
  3  | 
  4  | test.describe("I-TRACK browser smoke coverage", () => {
  5  |   test("landing page has accessible auth actions", async ({ page }) => {
  6  |     await page.goto("/");
  7  |     await expect(page.getByRole("link", { name: /log in/i })).toBeVisible();
  8  |     await expect(page.getByRole("link", { name: /start free/i })).toBeVisible();
  9  |     expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  10 |   });
  11 | 
  12 |   test("login form exposes labeled fields and responsive layout", async ({ page }) => {
  13 |     await page.goto("/login");
  14 |     await expect(page.getByLabel(/email address/i)).toBeVisible();
  15 |     await expect(page.getByLabel(/^password$/i)).toBeVisible();
  16 |     await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
> 17 |     expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
     |                                                                   ^ Error: expect(received).toEqual(expected) // deep equality
  18 |   });
  19 | });
  20 | 
```