---
title: ""
# Awards have no pages of their own: the grouped list at /awards/ is the only
# place they are shown. `render: link` keeps each entry available to the
# collection blocks on that page while writing no /awards/... HTML at all.
_build:
  render: never
  list: never
cascade:
  _build:
    render: never
    list: always
---
