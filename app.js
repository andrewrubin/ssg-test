const express = require("express");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const app = express();
const port = 3000;
const templateRoot = "views";

let globalData;

// set the templating engine
app.set("view engine", "pug");

// set up the static file folder (public assets, images, etc.)
app.use(express.static('static'))

// get global YAML data
try {
  globalData = yaml.load(fs.readFileSync(path.resolve("data.yaml"), "utf8"))
} catch(e) {
  console.error(e);
  return;
}

/**
 * Renders a Pug template based on the provided route.
 * This function assumes that your views live in a directory with the same name as the route provided, and that said directory includes an `index.pug` file. For example, the route "/about" expects the folder structure to be "views/about/index.pug"
 * @param {String} route - The URI endpoint for which to compile a Pug template.
 * @param {String} templatePath - The path to the view template, from the views directory. For example, "about/index.pug".
 */
function compilePug(route, templatePath) {
  if (!route) {
    console.error("Must provide route to compile Pug for.");
    return;
  }

  if (!templatePath) {
    console.error("Must provide a path to the view template.");
    return;
  }

  // get page-level YAML data
  let page;

  try {
    const dataFile = path.resolve(path.join(templateRoot, path.dirname(templatePath), "data.yaml"));
    page = yaml.load(fs.readFileSync(dataFile, 'utf8'));
  } catch(e) {
    console.error(e);
    return;
  }

  app.get(route, (req, res) => {
    res.render(templatePath, {
      globalData,
      page: {
        route,
        ...page,
      },
    })
  })
}

/**
 * Recursively checks the template directory, and compiles Pug for every Pug file found.
 * @param {String} directory - the absolute path to a template directory, as provided by path.resolve()
 */
function readFiles(directory) {
  fs.readdirSync(directory).map(filename => {
    
    const filePath = path.join(path.resolve(directory), filename);

    fs.stat(filePath, (err, stats) => {
      if (err) {
        console.error(err)
        return
      }
      
      if (stats.isFile() && path.extname(filePath) === ".pug") {
        // Split the filepath into pieces based on "/"
        const pathParts = filePath.split(path.sep);

        // Slice out the path to the file, starting from the template directory
        const templatePath = 
          path.join(
            ...pathParts.slice(
              pathParts.findIndex(x => x === templateRoot) + 1
            )
          )

        // For the route: get the templatePath, but without the filename:
        const route = path.dirname(templatePath)
        const finalRoute = route === "." ? "/" : `/${route}`;

        compilePug(finalRoute, templatePath);
      } else if (stats.isDirectory()) {
        readFiles(filePath);
      }
    })

  })

}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
})

readFiles(path.resolve(templateRoot));