module.exports = {
    plugins: [
      'remark-preset-lint-recommended',
      ['remark-lint-list-item-indent', 'space'],
      ['remark-lint-maximum-line-length', 120]
    ]
  };