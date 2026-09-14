import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { build } from "esbuild";

const root = new URL("../", import.meta.url);
const dist = new URL("../dist/", import.meta.url);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of ["index.html", "styles.css", "manifest.webmanifest", "sw.js", "icon.svg"]) {
  await cp(new URL(file, root), new URL(file, dist));
}
await cp(new URL("src/", root), new URL("src/", dist), { recursive: true });
await cp(new URL("supabase/", root), new URL("supabase/", dist), { recursive: true });
await mkdir(new URL("src/vendor/", dist), { recursive: true });
await build({
  entryPoints: [new URL("src/supabase-vendor-entry.js", root).pathname],
  bundle: true,
  format: "esm",
  minify: true,
  outfile: new URL("src/vendor/supabase.js", dist).pathname,
  platform: "browser",
  target: ["es2020"],
});
await rm(new URL("src/supabase-vendor-entry.js", dist), { force: true });
await writeFile(new URL(".nojekyll", dist), "");
console.log("静态网站已构建到 dist/");
