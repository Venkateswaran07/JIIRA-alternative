# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> I-TRACK browser smoke coverage >> landing page has accessible auth actions
- Location: tests\smoke.spec.ts:5:3

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -   1
+ Received  + 762

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
+               "bgColor": "#fbfaf7",
+               "contrastRatio": 4.38,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#8758e8",
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "bold",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.38 (foreground color: #8758e8, background color: #fbfaf7, font size: 7.5pt (10px), font weight: bold). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"landing\">",
+                 "target": Array [
+                   ".landing",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 4.38 (foreground color: #8758e8, background color: #fbfaf7, font size: 7.5pt (10px), font weight: bold). Expected contrast ratio of 4.5:1",
+         "html": "<div class=\"eyebrow\"><span></span>Built for teams that ship</div>",
+         "impact": "serious",
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
+               "bgColor": "#e18a64",
+               "contrastRatio": 2.61,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#ffffff",
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "bold",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 2.61 (foreground color: #ffffff, background color: #e18a64, font size: 6.0pt (8px), font weight: bold). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<span>AK</span>",
+                 "target": Array [
+                   ".proof-avatars > span:nth-child(1)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 2.61 (foreground color: #ffffff, background color: #e18a64, font size: 6.0pt (8px), font weight: bold). Expected contrast ratio of 4.5:1",
+         "html": "<span>AK</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".proof-avatars > span:nth-child(1)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#658bc9",
+               "contrastRatio": 3.44,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#ffffff",
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "bold",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.44 (foreground color: #ffffff, background color: #658bc9, font size: 6.0pt (8px), font weight: bold). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<span>JM</span>",
+                 "target": Array [
+                   ".proof-avatars > span:nth-child(2)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.44 (foreground color: #ffffff, background color: #658bc9, font size: 6.0pt (8px), font weight: bold). Expected contrast ratio of 4.5:1",
+         "html": "<span>JM</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".proof-avatars > span:nth-child(2)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#9d77c7",
+               "contrastRatio": 3.56,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#ffffff",
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "bold",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.56 (foreground color: #ffffff, background color: #9d77c7, font size: 6.0pt (8px), font weight: bold). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<span>RL</span>",
+                 "target": Array [
+                   ".proof-avatars > span:nth-child(3)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.56 (foreground color: #ffffff, background color: #9d77c7, font size: 6.0pt (8px), font weight: bold). Expected contrast ratio of 4.5:1",
+         "html": "<span>RL</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".proof-avatars > span:nth-child(3)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#fbfaf7",
+               "contrastRatio": 3.37,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#8b8790",
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.37 (foreground color: #8b8790, background color: #fbfaf7, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"landing\">",
+                 "target": Array [
+                   ".landing",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.37 (foreground color: #8b8790, background color: #fbfaf7, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p><b>Trusted by ambitious teams</b><br>No credit card · Free to get started</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".hero-proof > p",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#f8f7fb",
+               "contrastRatio": 2.81,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#9992a4",
+               "fontSize": "5.3pt (7px)",
+               "fontWeight": "bold",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 2.81 (foreground color: #9992a4, background color: #f8f7fb, font size: 5.3pt (7px), font weight: bold). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"mini-app\">",
+                 "target": Array [
+                   ".mini-app",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 2.81 (foreground color: #9992a4, background color: #f8f7fb, font size: 5.3pt (7px), font weight: bold). Expected contrast ratio of 4.5:1",
+         "html": "<span>SPRINT OVERVIEW</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".mini-top > span",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#f8f7fb",
+               "contrastRatio": 3.07,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#918c98",
+               "fontSize": "5.3pt (7px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.07 (foreground color: #918c98, background color: #f8f7fb, font size: 5.3pt (7px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"mini-app\">",
+                 "target": Array [
+                   ".mini-app",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.07 (foreground color: #918c98, background color: #f8f7fb, font size: 5.3pt (7px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<small>Current sprint</small>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".mini-heading > div > small",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#ffffff",
+               "contrastRatio": 2.97,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#9993a2",
+               "fontSize": "4.5pt (6px)",
+               "fontWeight": "bold",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 2.97 (foreground color: #9993a2, background color: #ffffff, font size: 4.5pt (6px), font weight: bold). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<article><small>SPRINT HEALTH</small><strong>84<span>%</span></strong><i>On track</i></article>",
+                 "target": Array [
+                   ".mini-stats > article:nth-child(1)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 2.97 (foreground color: #9993a2, background color: #ffffff, font size: 4.5pt (6px), font weight: bold). Expected contrast ratio of 4.5:1",
+         "html": "<small>SPRINT HEALTH</small>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "article:nth-child(1) > small",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#f3fbd1",
+               "contrastRatio": 4.36,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#6e7a29",
+               "fontSize": "4.5pt (6px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.36 (foreground color: #6e7a29, background color: #f3fbd1, font size: 4.5pt (6px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<i>On track</i>",
+                 "target": Array [
+                   "article:nth-child(1) > i",
+                 ],
+               },
+               Object {
+                 "html": "<article><small>SPRINT HEALTH</small><strong>84<span>%</span></strong><i>On track</i></article>",
+                 "target": Array [
+                   ".mini-stats > article:nth-child(1)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 4.36 (foreground color: #6e7a29, background color: #f3fbd1, font size: 4.5pt (6px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<i>On track</i>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "article:nth-child(1) > i",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#ffffff",
+               "contrastRatio": 2.97,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#9993a2",
+               "fontSize": "4.5pt (6px)",
+               "fontWeight": "bold",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 2.97 (foreground color: #9993a2, background color: #ffffff, font size: 4.5pt (6px), font weight: bold). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<article><small>COMPLETED</small><strong>32<span> / 41</span></strong><div class=\"mini-bar\"><i></i></div></article>",
+                 "target": Array [
+                   ".mini-stats > article:nth-child(2)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 2.97 (foreground color: #9993a2, background color: #ffffff, font size: 4.5pt (6px), font weight: bold). Expected contrast ratio of 4.5:1",
+         "html": "<small>COMPLETED</small>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "article:nth-child(2) > small",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#ffffff",
+               "contrastRatio": 2.43,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#aaa4af",
+               "fontSize": "6.0pt (8px)",
+               "fontWeight": "bold",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 2.43 (foreground color: #aaa4af, background color: #ffffff, font size: 6.0pt (8px), font weight: bold). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<article><small>COMPLETED</small><strong>32<span> / 41</span></strong><div class=\"mini-bar\"><i></i></div></article>",
+                 "target": Array [
+                   ".mini-stats > article:nth-child(2)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 2.43 (foreground color: #aaa4af, background color: #ffffff, font size: 6.0pt (8px), font weight: bold). Expected contrast ratio of 4.5:1",
+         "html": "<span> / 41</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "article:nth-child(2) > strong > span",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#fbfaf7",
+               "contrastRatio": 4.38,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#8758e8",
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "bold",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.38 (foreground color: #8758e8, background color: #fbfaf7, font size: 7.5pt (10px), font weight: bold). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"landing\">",
+                 "target": Array [
+                   ".landing",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 4.38 (foreground color: #8758e8, background color: #fbfaf7, font size: 7.5pt (10px), font weight: bold). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"section-kicker\">ONE WORKSPACE. TOTAL CLARITY.</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".section-intro > div > .section-kicker",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#ffffff",
+               "contrastRatio": 4.35,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#7c7782",
+               "fontSize": "9.8pt (13px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.35 (foreground color: #7c7782, background color: #ffffff, font size: 9.8pt (13px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<article>",
+                 "target": Array [
+                   ".feature-grid > article:nth-child(1)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 4.35 (foreground color: #7c7782, background color: #ffffff, font size: 9.8pt (13px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p>Live sprint health, workload signals, and delivery forecasts give every team an honest view of what happens next.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "article:nth-child(1) > p",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#ffffff",
+               "contrastRatio": 4.35,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#7c7782",
+               "fontSize": "9.8pt (13px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.35 (foreground color: #7c7782, background color: #ffffff, font size: 9.8pt (13px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<article>",
+                 "target": Array [
+                   ".feature-grid > article:nth-child(2)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 4.35 (foreground color: #7c7782, background color: #ffffff, font size: 9.8pt (13px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p>Ask I-TRACK what changed, where work is blocked, and what deserves attention—without another status meeting.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "article:nth-child(2) > p",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#ffffff",
+               "contrastRatio": 4.35,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#7c7782",
+               "fontSize": "9.8pt (13px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.35 (foreground color: #7c7782, background color: #ffffff, font size: 9.8pt (13px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<article>",
+                 "target": Array [
+                   ".feature-grid > article:nth-child(3)",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 4.35 (foreground color: #7c7782, background color: #ffffff, font size: 9.8pt (13px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p>Plan, prioritize, and ship from one focused workspace built for product, design, and engineering teams.</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "article:nth-child(3) > p",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#211e28",
+               "contrastRatio": 3.58,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#8758e8",
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "bold",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.58 (foreground color: #8758e8, background color: #211e28, font size: 7.5pt (10px), font weight: bold). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<section class=\"workflow-section\" id=\"workflow\">",
+                 "target": Array [
+                   "#workflow",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.58 (foreground color: #8758e8, background color: #211e28, font size: 7.5pt (10px), font weight: bold). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"section-kicker\">FROM PLAN TO PROGRESS</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".workflow-copy > .section-kicker",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#e79d78",
+               "contrastRatio": 2.21,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#ffffff",
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "bold",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 2.21 (foreground color: #ffffff, background color: #e79d78, font size: 7.5pt (10px), font weight: bold). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<span>MC</span>",
+                 "target": Array [
+                   ".quote-person > span",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 2.21 (foreground color: #ffffff, background color: #e79d78, font size: 7.5pt (10px), font weight: bold). Expected contrast ratio of 4.5:1",
+         "html": "<span>MC</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".quote-person > span",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#fbfaf7",
+               "contrastRatio": 2.84,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#99949e",
+               "fontSize": "9.0pt (12px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 2.84 (foreground color: #99949e, background color: #fbfaf7, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"landing\">",
+                 "target": Array [
+                   ".landing",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 2.84 (foreground color: #99949e, background color: #fbfaf7, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<small>VP of Product at Northstar</small>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "p > small",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#d8f36a",
+               "contrastRatio": 4.48,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#626e28",
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "bold",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.48 (foreground color: #626e28, background color: #d8f36a, font size: 7.5pt (10px), font weight: bold). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<section class=\"cta-section\" id=\"pricing\">",
+                 "target": Array [
+                   "#pricing",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 4.48 (foreground color: #626e28, background color: #d8f36a, font size: 7.5pt (10px), font weight: bold). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"section-kicker\">YOUR NEXT SPRINT STARTS HERE</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#pricing > div:nth-child(1) > .section-kicker",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#d8f36a",
+               "contrastRatio": 4.19,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#68722f",
+               "fontSize": "6.8pt (9px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.19 (foreground color: #68722f, background color: #d8f36a, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<section class=\"cta-section\" id=\"pricing\">",
+                 "target": Array [
+                   "#pricing",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 4.19 (foreground color: #68722f, background color: #d8f36a, font size: 6.8pt (9px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<small>Free forever for teams up to 10</small>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "#pricing > div:nth-child(2) > small",
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
+     "description": "Ensure the order of headings is semantically correct",
+     "help": "Heading levels should only increase by one",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.12/heading-order?application=playwright",
+     "id": "heading-order",
+     "impact": "moderate",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "heading-order",
+             "impact": "moderate",
+             "message": "Heading order invalid",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Heading order invalid",
+         "html": "<h3>Momentum is building.</h3>",
+         "impact": "moderate",
+         "none": Array [],
+         "target": Array [
+           "div > h3",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.semantics",
+       "best-practice",
+     ],
+   },
+ ]
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - link "I-TRACK home" [ref=e5] [cursor=pointer]:
      - /url: "#top"
      - text: I-TRACK
    - button "Toggle navigation" [ref=e7] [cursor=pointer]:
      - img [ref=e8]
    - link "Start free" [ref=e10] [cursor=pointer]:
      - /url: /register
      - text: Start free
      - img [ref=e11]
  - main [ref=e14]:
    - status [ref=e15]: Showing the latest available product preview.
    - generic [ref=e16]:
      - generic [ref=e17]:
        - generic [ref=e18]: Built for teams that ship
        - heading "Keep every sprint on track." [level=1] [ref=e20]:
          - text: Keep every sprint
          - emphasis [ref=e21]: on track.
        - paragraph [ref=e22]: I-TRACK brings planning, delivery signals, and AI-powered insight into one calm workspace—so your team can move with clarity.
        - generic [ref=e23]:
          - link "Start tracking for free" [ref=e24] [cursor=pointer]:
            - /url: /register
            - text: Start tracking for free
            - img [ref=e25]
          - link "See how it works" [ref=e27] [cursor=pointer]:
            - /url: "#workflow"
            - img [ref=e28]
            - text: See how it works
        - generic [ref=e31]:
          - generic [ref=e32]:
            - generic [ref=e33]: AK
            - generic [ref=e34]: JM
            - generic [ref=e35]: RL
            - generic [ref=e36]: +2k
          - paragraph [ref=e37]:
            - text: Trusted by ambitious teams
            - text: No credit card · Free to get started
      - generic "I-TRACK sprint dashboard preview" [ref=e38]:
        - generic [ref=e40]:
          - generic [ref=e41]:
            - img [ref=e44]
            - img [ref=e50]
          - generic [ref=e52]:
            - generic [ref=e53]:
              - generic [ref=e54]: SPRINT OVERVIEW
              - generic [ref=e55]:
                - img [ref=e56]
                - generic [ref=e59]: AK
            - generic [ref=e61]:
              - text: Current sprint
              - heading "Momentum is building." [level=3] [ref=e62]
            - generic [ref=e63]:
              - article [ref=e64]:
                - text: SPRINT HEALTH
                - strong [ref=e65]: 84%
                - text: On track
              - article [ref=e66]:
                - text: COMPLETED
                - strong [ref=e67]: 32 / 41
            - generic [ref=e71]: Connect your workspace to see live tickets
    - generic [ref=e72]:
      - paragraph [ref=e73]: Helping modern teams build what matters
      - generic [ref=e74]:
        - generic [ref=e75]: northstar
        - generic [ref=e76]: Vertex
        - generic [ref=e77]: APERTURE
        - generic [ref=e78]: lumon
        - generic [ref=e79]: QUANTUM
    - generic [ref=e80]:
      - generic [ref=e81]:
        - generic [ref=e82]:
          - generic [ref=e83]: ONE WORKSPACE. TOTAL CLARITY.
          - heading "Less tracking. More momentum." [level=2] [ref=e84]:
            - text: Less tracking.
            - text: More momentum.
        - paragraph [ref=e85]: Your team shouldn't have to chase updates across five tools. I-TRACK puts the signal front and center, so everyone knows what matters now.
      - generic [ref=e86]:
        - article [ref=e87]:
          - img [ref=e89]
          - heading "See risk before it slips" [level=3] [ref=e92]
          - paragraph [ref=e93]: Live sprint health, workload signals, and delivery forecasts give every team an honest view of what happens next.
          - link "Learn more" [ref=e94] [cursor=pointer]:
            - /url: /register
            - text: Learn more
            - img [ref=e95]
        - article [ref=e98]:
          - img [ref=e100]
          - heading "Turn updates into action" [level=3] [ref=e103]
          - paragraph [ref=e104]: Ask I-TRACK what changed, where work is blocked, and what deserves attention—without another status meeting.
          - link "Learn more" [ref=e105] [cursor=pointer]:
            - /url: /register
            - text: Learn more
            - img [ref=e106]
        - article [ref=e109]:
          - img [ref=e111]
          - heading "Keep work moving" [level=3] [ref=e115]
          - paragraph [ref=e116]: Plan, prioritize, and ship from one focused workspace built for product, design, and engineering teams.
          - link "Learn more" [ref=e117] [cursor=pointer]:
            - /url: /register
            - text: Learn more
            - img [ref=e118]
    - generic [ref=e122]:
      - generic [ref=e123]:
        - generic [ref=e124]: FROM PLAN TO PROGRESS
        - heading "A clearer way to move work forward." [level=2] [ref=e125]
        - paragraph [ref=e126]: Turn goals into focused sprints, spot trouble early, and help every teammate do their best work.
        - generic [ref=e127]:
          - img [ref=e128]
          - text: Plan around real team capacity
        - generic [ref=e130]:
          - img [ref=e131]
          - text: Catch blockers before standup
        - generic [ref=e133]:
          - img [ref=e134]
          - text: Share progress without the status chase
        - link "Explore I-TRACK" [ref=e136] [cursor=pointer]:
          - /url: /register
          - text: Explore I-TRACK
          - img [ref=e137]
      - generic [ref=e139]:
        - img [ref=e142]
        - generic [ref=e144]:
          - generic [ref=e145]: SPRINT CONFIDENCE
          - generic [ref=e146]: 92%
        - generic [ref=e148]:
          - img [ref=e149]
          - generic [ref=e151]:
            - text: 2 risks caught early
            - generic [ref=e152]: AI sprint analysis
        - generic [ref=e153]:
          - generic [ref=e154]: DELIVERY TREND
          - img [ref=e155]
    - generic [ref=e157]:
      - img [ref=e158]
      - blockquote [ref=e161]: "“I-TRACK gave us back the one thing our team was missing: a shared sense of what matters.”"
      - generic [ref=e162]:
        - generic [ref=e163]: MC
        - paragraph [ref=e164]:
          - generic [ref=e165]: Maya Chen
          - generic [ref=e166]: VP of Product at Northstar
    - generic [ref=e167]:
      - generic [ref=e168]:
        - generic [ref=e169]: YOUR NEXT SPRINT STARTS HERE
        - heading "Ready to move with clarity?" [level=2] [ref=e170]:
          - text: Ready to move
          - text: with clarity?
      - generic [ref=e171]:
        - paragraph [ref=e172]: Bring your team, your work, and your ambition. I-TRACK will help you keep the rest on track.
        - link "Start for free" [ref=e173] [cursor=pointer]:
          - /url: /register
          - text: Start for free
          - img [ref=e174]
        - generic [ref=e176]: Free forever for teams up to 10
  - contentinfo [ref=e177]:
    - link "I-TRACK" [ref=e178] [cursor=pointer]:
      - /url: "#top"
      - text: I-TRACK
    - generic [ref=e180]:
      - link "Product" [ref=e181] [cursor=pointer]:
        - /url: "#features"
      - link "Pricing" [ref=e182] [cursor=pointer]:
        - /url: "#pricing"
      - link "Log in" [ref=e183] [cursor=pointer]:
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
  7  |     await expect(page.getByRole("link", { name: /log in/i })).toBeVisible();
  8  |     await expect(page.getByRole("link", { name: /start free/i })).toBeVisible();
> 9  |     expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
     |                                                                   ^ Error: expect(received).toEqual(expected) // deep equality
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