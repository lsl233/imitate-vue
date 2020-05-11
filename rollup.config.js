export default {
    input: 'src/main.js',
    output: {
        file: 'dist/bundle.js',
        name: 'Seed',
        format: 'umd'
    },
    watch: {
        include: 'src/**'
    }
};