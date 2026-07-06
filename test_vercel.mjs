import fs from 'fs';
fetch('https://final-project-presentation.vercel.app')
  .then(r => r.text())
  .then(t => {
    const match = t.match(/src="(\/assets\/index-[^"]+?\.js)"/);
    if(match) {
      fetch('https://final-project-presentation.vercel.app'+match[1])
        .then(r => r.text())
        .then(js => {
          const idx = js.indexOf('qqmzhdnofylwjkyqeqei');
          console.log(js.substring(idx - 100, idx + 200));
        });
    }
  });
