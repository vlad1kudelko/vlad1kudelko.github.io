module.exports = {
    content: [
        '../template/**/*.{pug,html,js}',
        './node_modules/flowbite/**/*.js',
    ],
    theme: {
        extend: {},
    },
    plugins: [
        require('@tailwindcss/typography'),
        require('flowbite/plugin'),
    ],
}
