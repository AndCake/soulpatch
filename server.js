let page = 'index';
let pageData = {
    _: {
        i18n: function(a, b) {
            var translations = {'welcomeHeadline': 'Hallo, Welt!'};
            return translations[a] || ((this[a] || a) + ' ' + (this[b] || b));
        }
    },
    featuredProducts: [{
        id: '1',
        url: '/product1',
        name: 'Tick-B-Gone',
        image: 'https://pbs.twimg.com/media/BsSPYfNCMAAheeS.png',
        price: 12.99
    }, {
        id: '2',
        url: '/product2',
        name: 'Hand Creme',
        image: 'https://kendrakandlestar.files.wordpress.com/2012/09/potions_trollsnot.jpg',
        price: 20.95
    }],
    checking: true
};

page = require('./compiled/' + page);
let start = +new Date;
console.log(page.render(pageData));
process.stderr.write('rendered in ' + (+new Date - start) + 'ms\n');
