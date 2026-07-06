const fs = require('fs');
fetch('https://final-project-presentation.vercel.app')
  .then(r => r.text())
  .then(t => {
    const match = t.match(/src="(\/assets\/index-[^"]+?\.js)"/);
    if(match) {
      console.log('Fetching', 'https://final-project-presentation.vercel.app'+match[1]);
      fetch('https://final-project-presentation.vercel.app'+match[1])
        .then(r => r.text())
        .then(js => {
          console.log('Includes fallback url: ' + js.includes('qqmzhdnofylwjkyqeqei'));
          console.log('Includes ErrorBoundary: ' + js.includes('Application Crash Error!'));
        });
    } else {
      console.log('no match');
    }
  });
