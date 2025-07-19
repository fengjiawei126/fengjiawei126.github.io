---
title: "GSpect: Spectral filtering for cross-scale graph classification"
authors:
- Xiaoyu Zhang
- Wenchuan Yang
- Jiawei Feng
- Bitao Dai
- Tianci Bu
- Xin Lu*
date: "2024-12-11T00:00:00Z"

# Schedule page publish date (NOT publication's date).
publishDate: "2025-07-19T00:00:00Z"

# Publication type.
# Accepts a single type but formatted as a YAML list (for Hugo requirements).
# Enter a publication type from the CSL standard.
# publication_types: ["article"]

# Publication name and optional abbreviated publication name.
publication: "*IEEE Transactions on Network Science and Engineering*, 12(1), 547-558, doi: 10.1109/TNSE.2024.3513456"
# publication_short: ""

abstract: "Identifying structures in common forms the basis for networked systems design and optimization. However, real structures represented by graphs are often of varying sizes, leading to the low accuracy of traditional graph classification methods. These graphs are called cross-scale graphs. To overcome this limitation, in this study, we propose GSpect, an advanced spectral graph filtering model for cross-scale graph classification tasks. Compared with other methods, we use graph wavelet neural networks for the convolution layer of the model, which aggregates multi-scale messages to generate graph representations. We design a spectral-pooling layer which aggregates nodes to one node to reduce the cross-scale graphs to the same size. We collect and construct the cross-scale benchmark data set, MSG (Multi Scale Graphs). Experiments reveal that, on open data sets, GSpect improves the performance of classification accuracy by 1.62% on average, and for a maximum of 3.33% on PROTEINS. On MSG, GSpect improves the performance of classification accuracy by 13.38% on average. GSpect fills the gap in cross-scale graph classification studies and has potential to provide assistance in application research like diagnosis of brain disease by predicting the brain network's label and developing new drugs with molecular structures learned from their counterparts in other systems."

tags:
- Machine learning
- Network science

featured: true

links:
- name: Link
  url: https://doi.org/10.1109/TNSE.2024.3513456
url_pdf: uploads/Gspect.pdf
# url_code: 'https://github.com/HugoBlox/hugo-blox-builder'
# url_dataset: '#'
# url_poster: '#'
# url_project: ''
# url_slides: ''
# url_source: '#'
# url_video: '#'

# Featured image
# To use, add an image named `featured.jpg/png` to your page's folder. 
image:
  caption: 'The model structure of GSpect.'
  focal_point: ""
  preview_only: false

# Associated Projects (optional).
#   Associate this publication with one or more of your projects.
#   Simply enter your project's folder or file name without extension.
#   E.g. `internal-project` references `content/project/internal-project/index.md`.
#   Otherwise, set `projects: []`.
# projects:
# - internal-project

# Slides (optional).
#   Associate this publication with Markdown slides.
#   Simply enter your slide deck's filename without extension.
#   E.g. `slides: "example"` references `content/slides/example/index.md`.
#   Otherwise, set `slides: ""`.
# slides: example
---
<!-- 
This work is driven by the results in my [previous paper](/publication/conference-paper/) on LLMs.

{{% callout note %}}
Create your slides in Markdown - click the *Slides* button to check out the example.
{{% /callout %}}

Add the publication's **full text** or **supplementary notes** here. You can use rich formatting such as including [code, math, and images](https://docs.hugoblox.com/content/writing-markdown-latex/). -->
