import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { plugin } from "bun";

GlobalRegistrator.register();

plugin({
  name: "inline-css",
  setup(build) {
    build.onLoad({ filter: /\.css/ }, async (args) => {
      const css = await Bun.file(args.path.replace(/\?.*$/, "")).text();
      return { contents: `export default ${JSON.stringify(css)};`, loader: "js" };
    });
  },
});
