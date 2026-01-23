// Constants
const WIKI_BASE_URL = "https://www.poe2wiki.net/w/api.php";
const MAX_PREVIEW_LENGTH = 1000;
const CACHE_TTL_MS = 3600000; // 1 hour

/**
 * Helper function to fetch wiki page content via MediaWiki API
 *
 * @param {string} pageName - The name of the wiki page to fetch
 * @returns {Promise<string | null>} - The page content or null if not found
 */
async function fetchWikiPageContent(pageName: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    prop: "revisions",
    titles: pageName,
    rvprop: "content",
    format: "json",
    rvslots: "main",
    redirects: "1",
  });

  const response = await fetch(`${WIKI_BASE_URL}?${params.toString()}`);

  // Check HTTP status
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: any = await response.json();

  if (!data.query?.pages) return null;

  const pageId = Object.keys(data.query.pages)[0];
  if (pageId === "-1") return null;

  const page: any = data.query.pages[pageId];

  // Safely check for revisions
  if (!page.revisions || page.revisions.length === 0) return null;

  const content = page.revisions[0].slots?.main?.["*"];
  return content || null;
}

/**
 * Fetches the raw wiki page content for the specified Skill gem and parses the {{Item}} template
 * into a JSON object.
 *
 * @param {string} gemName - The name of the gem (e.g., "Gas Grenade")
 * @returns {Promise<Record<string, string> | null>} - The parsed JSON object or null if the page is not found
 */
export async function fetchGemData(
  gemName: string,
): Promise<Record<string, string> | null> {
  try {
    const content = await fetchWikiPageContent(gemName);
    if (!content) return null;

    // Find the {{Item}} template in the page content
    const startIdx = content.indexOf("{{Item");
    if (startIdx === -1) {
      // No Item template found - return null for consistency
      console.warn(`No {{Item}} template found for gem: ${gemName}`);
      return null;
    }

    const remainingContent = content.substring(startIdx);
    const result: Record<string, string> = {};
    const lines = remainingContent.split("\n");

    let currentKey = "";

    for (const line of lines) {
      // End of template
      if (line.trim() === "}}") break;

      if (line.includes("=")) {
        // Parse key-value pairs (e.g., |stat_text = ...)
        const parts = line.split("=");
        // Replace all pipe characters, not just the first one
        const keyPart = parts[0].replaceAll("|", "").trim();
        const valuePart = parts.slice(1).join("=").trim();

        if (keyPart) {
          currentKey = keyPart;
          result[currentKey] = valuePart;
        }
      } else if (currentKey && !line.trim().startsWith("|")) {
        // Handle multi-line fields like stat_text
        // If the line doesn't have '=' and doesn't start with '|',
        // it's a continuation of the previous key
        result[currentKey] += "\n" + line.trim();
      }
    }

    return result;
  } catch (error) {
    console.error("Wiki Fetch Error:", error);
    return null;
  }
}

/**
 * Interface for support gem information
 */
interface SupportGemInfo {
  name: string;
  description: string;
}

/**
 * Fetches the officially recommended support gems for a specific skill from the wiki.
 *
 * @param {string} gemName - The name of the active gem (e.g., "Gas Grenade")
 * @returns {Promise<SupportGemInfo[]>} - Array of recommended support gems
 */
export async function fetchCompatibleSupports(
  gemName: string,
): Promise<SupportGemInfo[]> {
  try {
    const content = await fetchWikiPageContent(gemName);
    if (!content) return [];

    // Find the "Recommended Support Gems" section
    let startIdx = content.toLowerCase().indexOf("{{recommended support gems");
    if (startIdx === -1) {
      startIdx = content.toLowerCase().indexOf("==recommended support gems==");
    }

    if (startIdx === -1) return [];

    const lines = content.substring(startIdx).split("\n");

    // Use Set for O(1) lookup performance instead of O(n) with array.includes()
    const gemsSet = new Set<string>();

    for (const line of lines) {
      // Stop if we hit a new major section (but not the "recommended" section itself)
      if (
        line.trim().startsWith("==") &&
        !line.toLowerCase().includes("recommended")
      ) {
        break;
      }

      // Extract gem names from {{il|Gem Name}} or {{il|Gem Name|Display}} templates
      const ilMatches = line.matchAll(/{{il\|([^}|]+)(?:\|[^}]+)?}}/g);
      for (const match of ilMatches) {
        const name = match[1].trim();
        if (name) {
          gemsSet.add(name);
        }
      }

      // Stop at the end of the template block
      if (line.trim() === "}}") break;
    }

    // Convert Set to array of SupportGemInfo objects
    return Array.from(gemsSet).map((name) => ({
      name,
      description: "Recommended Support Gem",
    }));
  } catch (error) {
    console.error("Support Fetch Error:", error);
    return [];
  }
}
