// wiki.ts

export async function fetchGemData(gemName: string) {
  const baseUrl = "https://www.poe2wiki.net/w/api.php";
  const params = new URLSearchParams({
    action: "query",
    prop: "revisions",
    titles: gemName,
    rvprop: "content",
    format: "json",
    rvslots: "main",
    redirects: "1",
  });

  try {
    const response = await fetch(`${baseUrl}?${params.toString()}`);
    const data = await response.json();
    if (!data.query?.pages) return null;

    const pageId = Object.keys(data.query.pages)[0];
    if (pageId === "-1") return null;

    const content = data.query.pages[pageId].revisions[0].slots.main["*"];

    // 1. Find the start of the {{Item template
    const startIdx = content.indexOf("{{Item");
    if (startIdx === -1) return { raw: content.substring(0, 1000) };

    // 2. Extract everything from {{Item to the end of the string
    // and then work backwards to find the last }} of the main block.
    // This prevents inner templates like {{c|...}} from breaking the match.
    const remainingContent = content.substring(startIdx);

    // 3. Robust Line-by-Line Parsing
    const result: Record<string, string> = {};
    const lines = remainingContent.split("\n");

    let currentKey = "";

    for (const line of lines) {
      // Check for the end of the Item template
      if (line.trim() === "}}") break;

      if (line.includes("=")) {
        // Handle lines starting with | (e.g., |stat_text = ...)
        const parts = line.split("=");
        const keyPart = parts[0].replace("|", "").trim();
        const valuePart = parts.slice(1).join("=").trim();

        if (keyPart) {
          currentKey = keyPart;
          result[currentKey] = valuePart;
        }
      } else if (currentKey && line.trim().startsWith("|") === false) {
        // This handles multi-line fields like stat_text
        // If the line doesn't have an '=' and doesn't start with '|',
        // it's a continuation of the previous key.
        result[currentKey] += "\n" + line.trim();
      }
    }

    return result;
  } catch (error) {
    console.error("Wiki Fetch Error:", error);
    return null;
  }
}

// wiki.ts

export async function fetchCompatibleSupports(tags: string[]) {
  const baseUrl = "https://www.poe2wiki.net/w/api.php";

  // We construct a query to find items of class 'Support Skill Gem'
  // that share at least one tag with our active gem.
  // We use the 'skill_gems' table or 'items' table depending on wiki structure.

  const tagConditions = tags
    .map((tag) => `gem_tags LIKE "%${tag.trim()}%"`)
    .join(" OR ");

  const params = new URLSearchParams({
    action: "cargoquery",
    format: "json",
    tables: "skill_gems",
    fields: "name, gem_tags, description",
    // Filter for Support Gems that match our tags
    where: `class_id="Support Skill Gem" AND (${tagConditions})`,
    limit: "15",
  });

  try {
    const response = await fetch(`${baseUrl}?${params.toString()}`);
    const data = await response.json();
    return data.cargoquery?.map((item: any) => item.title) || [];
  } catch (error) {
    console.error("Support Fetch Error:", error);
    return [];
  }
}
