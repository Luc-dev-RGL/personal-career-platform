const key = process.env.GEMINI_API_KEY;
fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + key)
  .then((r) => r.json())
  .then((d) => {
    if (!d.models) { console.log(JSON.stringify(d, null, 2)); return; }
    for (const m of d.models) {
      console.log(m.name, "  [" + (m.supportedGenerationMethods || []).join(",") + "]");
    }
  });
