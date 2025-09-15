export default {
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string', validation: R => R.required() },
    { name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title', maxLength: 96 }, validation: R => R.required() },
    { name: 'excerpt', title: 'Excerpt', type: 'text' },
    { name: 'publishedAt', title: 'Published at', type: 'datetime' },
    { name: 'body', title: 'Body', type: 'array', of: [{ type: 'block' }] },
  ]
}
