# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> I-TRACK browser smoke coverage >> landing page has accessible auth actions
- Location: tests\smoke.spec.ts:5:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('link', { name: /log in/i })
Expected: visible
Error: strict mode violation: getByRole('link', { name: /log in/i }) resolved to 2 elements:
    1) <a href="/login" data-discover="true">Log in</a> aka getByRole('banner').getByRole('link', { name: 'Log in' })
    2) <a href="/login" data-discover="true">Log in</a> aka getByRole('contentinfo').getByRole('link', { name: 'Log in' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('link', { name: /log in/i })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - link "I-TRACK home" [ref=e5] [cursor=pointer]:
      - /url: "#top"
      - text: I-TRACK
    - navigation "Main navigation" [ref=e7]:
      - link "Product" [ref=e8] [cursor=pointer]:
        - /url: "#features"
      - link "How it works" [ref=e9] [cursor=pointer]:
        - /url: "#workflow"
      - link "Customers" [ref=e10] [cursor=pointer]:
        - /url: "#customers"
      - link "Pricing" [ref=e11] [cursor=pointer]:
        - /url: "#pricing"
    - generic [ref=e12]:
      - link "Log in" [ref=e13] [cursor=pointer]:
        - /url: /login
      - link "Start free" [ref=e14] [cursor=pointer]:
        - /url: /register
        - text: Start free
        - img [ref=e15]
  - main [ref=e18]:
    - generic [ref=e19]:
      - generic [ref=e20]:
        - generic [ref=e21]: Built for teams that ship
        - heading "Keep every sprint on track." [level=1] [ref=e23]:
          - text: Keep every sprint
          - emphasis [ref=e24]: on track.
        - paragraph [ref=e25]: I-TRACK brings planning, delivery signals, and AI-powered insight into one calm workspace—so your team can move with clarity.
        - generic [ref=e26]:
          - link "Start tracking for free" [ref=e27] [cursor=pointer]:
            - /url: /register
            - text: Start tracking for free
            - img [ref=e28]
          - link "See how it works" [ref=e30] [cursor=pointer]:
            - /url: "#workflow"
            - img [ref=e31]
            - text: See how it works
        - generic [ref=e34]:
          - generic [ref=e35]:
            - generic [ref=e36]: AK
            - generic [ref=e37]: JM
            - generic [ref=e38]: RL
            - generic [ref=e39]: +2k
          - paragraph [ref=e40]:
            - text: Trusted by ambitious teams
            - text: No credit card · Free to get started
      - generic "I-TRACK sprint dashboard preview" [ref=e41]:
        - generic [ref=e43]:
          - generic [ref=e44]:
            - img [ref=e47]
            - img [ref=e53]
            - img [ref=e59]
            - img [ref=e64]
          - generic [ref=e71]:
            - generic [ref=e72]:
              - generic [ref=e73]: SPRINT OVERVIEW
              - generic [ref=e74]:
                - img [ref=e75]
                - generic [ref=e78]: AK
            - generic [ref=e79]:
              - generic [ref=e80]:
                - text: Current sprint
                - heading "Momentum is building." [level=3] [ref=e81]
              - button "+ Create issue" [disabled] [ref=e82]
            - generic [ref=e83]:
              - article [ref=e84]:
                - text: SPRINT HEALTH
                - strong [ref=e85]: 84%
                - text: On track
              - article [ref=e86]:
                - text: COMPLETED
                - strong [ref=e87]: 32 / 41
              - article [ref=e90]:
                - text: TEAM VELOCITY
                - strong [ref=e91]: +18%
                - img [ref=e92]
            - generic [ref=e95]: Connect your workspace to see live tickets
        - generic [ref=e96]:
          - img [ref=e98]
          - generic [ref=e101]:
            - generic [ref=e102]: SPRINT RISK
            - text: Low risk
          - strong [ref=e103]: "12"
        - generic [ref=e104]:
          - img [ref=e105]
          - generic [ref=e108]:
            - generic [ref=e109]: I-TRACK AI
            - text: 3 blockers resolved this week
    - generic [ref=e110]:
      - paragraph [ref=e111]: Helping modern teams build what matters
      - generic [ref=e112]:
        - generic [ref=e113]: northstar
        - generic [ref=e114]: Vertex
        - generic [ref=e115]: APERTURE
        - generic [ref=e116]: lumon
        - generic [ref=e117]: QUANTUM
    - generic [ref=e118]:
      - generic [ref=e119]:
        - generic [ref=e120]:
          - generic [ref=e121]: ONE WORKSPACE. TOTAL CLARITY.
          - heading "Less tracking. More momentum." [level=2] [ref=e122]:
            - text: Less tracking.
            - text: More momentum.
        - paragraph [ref=e123]: Your team shouldn't have to chase updates across five tools. I-TRACK puts the signal front and center, so everyone knows what matters now.
      - generic [ref=e124]:
        - article [ref=e125]:
          - img [ref=e127]
          - heading "See risk before it slips" [level=3] [ref=e130]
          - paragraph [ref=e131]: Live sprint health, workload signals, and delivery forecasts give every team an honest view of what happens next.
          - link "Learn more" [ref=e132] [cursor=pointer]:
            - /url: /register
            - text: Learn more
            - img [ref=e133]
        - article [ref=e136]:
          - img [ref=e138]
          - heading "Turn updates into action" [level=3] [ref=e141]
          - paragraph [ref=e142]: Ask I-TRACK what changed, where work is blocked, and what deserves attention—without another status meeting.
          - link "Learn more" [ref=e143] [cursor=pointer]:
            - /url: /register
            - text: Learn more
            - img [ref=e144]
        - article [ref=e147]:
          - img [ref=e149]
          - heading "Keep work moving" [level=3] [ref=e153]
          - paragraph [ref=e154]: Plan, prioritize, and ship from one focused workspace built for product, design, and engineering teams.
          - link "Learn more" [ref=e155] [cursor=pointer]:
            - /url: /register
            - text: Learn more
            - img [ref=e156]
    - generic [ref=e160]:
      - generic [ref=e161]:
        - generic [ref=e162]: FROM PLAN TO PROGRESS
        - heading "A clearer way to move work forward." [level=2] [ref=e163]
        - paragraph [ref=e164]: Turn goals into focused sprints, spot trouble early, and help every teammate do their best work.
        - generic [ref=e165]:
          - img [ref=e166]
          - text: Plan around real team capacity
        - generic [ref=e168]:
          - img [ref=e169]
          - text: Catch blockers before standup
        - generic [ref=e171]:
          - img [ref=e172]
          - text: Share progress without the status chase
        - link "Explore I-TRACK" [ref=e174] [cursor=pointer]:
          - /url: /register
          - text: Explore I-TRACK
          - img [ref=e175]
      - generic [ref=e177]:
        - img [ref=e180]
        - generic [ref=e182]:
          - generic [ref=e183]: SPRINT CONFIDENCE
          - generic [ref=e184]: 92%
        - generic [ref=e186]:
          - img [ref=e187]
          - generic [ref=e189]:
            - text: 2 risks caught early
            - generic [ref=e190]: AI sprint analysis
        - generic [ref=e191]:
          - generic [ref=e192]: DELIVERY TREND
          - img [ref=e193]
    - generic [ref=e195]:
      - img [ref=e196]
      - blockquote [ref=e199]: "“I-TRACK gave us back the one thing our team was missing: a shared sense of what matters.”"
      - generic [ref=e200]:
        - generic [ref=e201]: MC
        - paragraph [ref=e202]:
          - generic [ref=e203]: Maya Chen
          - generic [ref=e204]: VP of Product at Northstar
    - generic [ref=e205]:
      - generic [ref=e206]:
        - generic [ref=e207]: YOUR NEXT SPRINT STARTS HERE
        - heading "Ready to move with clarity?" [level=2] [ref=e208]:
          - text: Ready to move
          - text: with clarity?
      - generic [ref=e209]:
        - paragraph [ref=e210]: Bring your team, your work, and your ambition. I-TRACK will help you keep the rest on track.
        - link "Start for free" [ref=e211] [cursor=pointer]:
          - /url: /register
          - text: Start for free
          - img [ref=e212]
        - generic [ref=e214]: Free forever for teams up to 10
  - contentinfo [ref=e215]:
    - link "I-TRACK" [ref=e216] [cursor=pointer]:
      - /url: "#top"
      - text: I-TRACK
    - paragraph [ref=e218]: © 2026 I-TRACK. Built for momentum.
    - generic [ref=e219]:
      - link "Product" [ref=e220] [cursor=pointer]:
        - /url: "#features"
      - link "Pricing" [ref=e221] [cursor=pointer]:
        - /url: "#pricing"
      - link "Log in" [ref=e222] [cursor=pointer]:
        - /url: /login
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import AxeBuilder from "@axe-core/playwright";
  3  | 
  4  | test.describe("I-TRACK browser smoke coverage", () => {
  5  |   test("landing page has accessible auth actions", async ({ page }) => {
  6  |     await page.goto("/");
> 7  |     await expect(page.getByRole("link", { name: /log in/i })).toBeVisible();
     |                                                               ^ Error: expect(locator).toBeVisible() failed
  8  |     await expect(page.getByRole("link", { name: /start free/i })).toBeVisible();
  9  |     expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  10 |   });
  11 | 
  12 |   test("login form exposes labeled fields and responsive layout", async ({ page }) => {
  13 |     await page.goto("/login");
  14 |     await expect(page.getByLabel(/email address/i)).toBeVisible();
  15 |     await expect(page.getByLabel(/^password$/i)).toBeVisible();
  16 |     await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  17 |     expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  18 |   });
  19 | });
  20 | 
```