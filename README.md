# Steps to work on site

Before starting, you need to install [Node.js](https://nodejs.org/en/) on your computer.

1. Open a terminal in the repository folder.
2. Run `npm install` to install the required packages.
3. Run `npm run dev` to host the site [locally](http://localhost:3000). Any changes you make in code with be shown live in the browser.

# Adding firmware to code

1. Place new firmware files within the `public/firmware` folder.
2. Firmware is held in the `availableFirmware` object within `src/App.vue`. Simply add a new object within `availableFirmware`, updating its `title` and `url` properties to match the new firmware file.

```
availableFirmware: {
    'microPython_0_2_0': {
        title: 'microPython 0.2.0',
        url: 'firmware/SITCore-SC13-MP-Firmware-v0.2.0.glb',
        isGlb: true,
        image: null,
    },
},
```

# Steps to publish the site

1. Once you're happy with the changes, `CTRL` + `C` to kill the process that runs the local site.
2. Run `npm run build` to compile and build the `docs` files.
3. Using git, add the new `docs` files and remove the old ones.
4. Commit the changes and push.

