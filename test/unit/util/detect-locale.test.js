const supportedLocales = ['en', 'es', 'pt-br', 'de', 'it'];

Object.defineProperty(window.location,
    'search',
    {value: '?name=val', configurable: true}
);
Object.defineProperty(window.navigator,
    'language',
    {value: 'en-US', configurable: true}
);
