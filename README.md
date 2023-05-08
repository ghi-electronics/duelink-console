# Steps to work on site

Before starting, you need to install [Node.js](https://nodejs.org/en/) on your computer.

1. Open a terminal in the repository folder.
2. Run `npm install` to install the required packages.
3. Run `npm run dev` to host the site [locally](http://localhost:3000). Any changes you make in code with be shown live in the browser.
4. Done.

Note: If you install additional npm packages, doing `npm run dev` might error out. Delete the `docs` folder and the command should succeed.

# Steps to publish the site

1. Once you're happy with the changes, `CTRL` + `C` to kill the process that runs the local site.
   - Ensure `vite.config.js` has its `base` path as empty `''`.
2. Run `npm run build` to compile and build the `docs` folder's files.
3. Using git, add the new files and delete the ones that are missing.
4. Commit the changes and push.
5. Done.

# Adding firmware to code

1. Place new firmware files within the `public/firmware` folder.
2. Firmware is now held in the `src/js/firmware.js` file. Simply add a new object, updating its `boards`, `title` and `url` properties to match the new firmware file.
   - `boards` is an array of board characters the firmware applies to. These are the last character returned when getting a board's version. E.g. `P` stands for BrainPad Pulse.
3. Done.

```
'Due_SC13_100': {
   boards: ['P'],
   title: 'Due_SC13 (v1.0.0)',
   url: 'firmware/due_sc13_v100.ghi',
   isGlb: false,
   image: null,
},
```

# Updating demos.

1. Go to `src/js/demos.js`.
2. Simply add a new object with `label` and `code` properties.
3. Done.

