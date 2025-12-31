function generateSeoMeta(options = {})
{
  const {
    title = 'Default Title',
    description = 'Default page description.',
    image = '/content/img/site-logo.png',
    url = '',
    canonical = '',
    robots = 'index, follow',
    type = 'website'
  } = options;

  return {
    title,
    description,
    image,
    url,
    canonical: canonical || url,
    robots,
    type
  };
}

module.exports = generateSeoMeta;
