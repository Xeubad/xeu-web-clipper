import { parseHTML } from "linkedom";

const html = `<!doctype html><html><head>
<title>Test Article</title>
<meta name="author" content="Alice">
<meta property="article:published_time" content="2026-10-01T10:00:00Z">
<meta name="description" content="A test article">
<meta property="og:site_name" content="Example">
</head><body>
<nav>menu menu</nav>
<article>
  <h1>Test Article</h1>
  <p>This is the first paragraph with enough text to be considered an article. It talks about servers, proxies, and markdown conversion in some detail.</p>
  <h2>Section One</h2>
  <p>Second paragraph. It also has enough content for readability to keep the article. We need more than two hundred characters in total to pass the threshold.</p>
  <ul><li>one</li><li>two</li></ul>
  <pre><code class="language-bash">echo hello</code></pre>
  <p><img src="/img/a.png" alt="demo"> image above.</p>
</article>
</body></html>`;

const { window, document } = parseHTML(html);
globalThis.window = window;
globalThis.document = document;
globalThis.location = new URL("https://example.com/posts/test");
globalThis.Node = window.Node;
globalThis.Element = window.Element;

const { extract } = await import("../src/content.js");
const article = extract("readability");
console.log(JSON.stringify({
  title: article.title,
  author: article.author,
  published: article.published,
  site: article.site,
  url: article.url,
  length: article.length,
  hasFence: article.markdown.includes("```bash"),
  hasImage: article.markdown.includes("https://example.com/img/a.png"),
  hasList: article.markdown.includes("- one"),
}, null, 2));
console.log("--- markdown ---\n" + article.markdown);
