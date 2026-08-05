# Genre Explorer

I need a webpage/webview app written in typescript using simple frameworks and libraries such as astro for proper templating, alpine for client side interactivity and htmx for server side data interaction using sqlite. No npm packages should be used other than the ones required for the typescript runtime. We'll use tailwindcss. 



This webpage should be a "what would you rather?" type of page to help someone who's just getting into reading figure out what books and genres they'd rather read.



The flow should be, essentially:

- Open page > Click button > Start game > Show two alternatives of books > Picked book is compared against another alternative next time > Repeat n number of times until user is satisfied or at most 30 times > In the end, a summary of the most liked genres or topics is shown



We should also find a database of books online to determine a schematic as well

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/dc7e7dbf-3bd0-4daa-b7eb-d3646c4cef2e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
