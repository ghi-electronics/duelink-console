# Steps to work on site

Before starting, you need to install [Node.js](https://nodejs.org/en/) on your computer.

1. Open a terminal in the repository folder.
2. Run `npm install` to install the required packages.
3. Run `npm run dev` to host the site [locally](http://localhost:3000). Any changes you make in code with be shown live in the browser.
4. Done.

# Steps to publish the site

**Note: Building locally is no longer necessary.**

1. Commit changes and push to Github.
2. Github Actions will compile the JavaScript, build and deploy the page.
3. Done.

# Adding firmware to code

1. Place new firmware files within the `public/firmware` folder.
2. Firmware is now held in the `public/firmware.json` file. Simply add a new object, updating its properties (`name`, `versions`, `boards`).
   - `versions` is an object whose keys are the ids of different firmware versions. Each key has an object with an `id`, `name` and `url` property.
     - `id` is used to sort descending. The highest `id` will be considered the latest firmware.
     - `name` is self-explanatory.
     - `url` is the path to the file.
   - `boards` is an array of objects. Each object has a `name` and `id` property.
     - `name` is self-explanatory.
     - `id` is the character assigned to each board. E.g. `P` stands for BrainPad Pulse.
3. Commit changes and push to Github.
4. Github Actions will compile the JavaScript, build and deploy the page.
5. Done.

# Updating demos.

1. Go to `public/demos.json`.
2. Simply edit or add a new object with `label` and `code` properties.
3. Commit changes and push to Github.
4. Github Actions will compile the JavaScript, build and deploy the page.
5. Done.
