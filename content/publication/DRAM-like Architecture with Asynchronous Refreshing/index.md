---
title: 'DRAM-like Architecture with Asynchronous Refreshing for Continual Relation Extraction'

# Authors
# If you created a profile for a user (e.g. the default `admin` user), write the username (folder name) here
# and it will be replaced with their full name and linked to their profile.
authors:
  - Tianci Bu
  - Kang Yang
  - Wenchuan Yang
  - Jiawei Feng
  - Xiaoyu Zhang
  - Xin Lu *

# Author notes (optional)
# author_notes:
  # - 'Equal contribution'
  # - 'Equal contribution'

date: '2024-05-13T00:00:00Z'
# doi: ''
reading_time: false

# Schedule page publish date (NOT publication's date).
publishDate: '2025-07-19T00:00:00Z'

# Publication type.
# Accepts a single type but formatted as a YAML list (for Hugo requirements).
# Enter a publication type from the CSL standard.
# publication_types: ['paper-conference']

# Publication name and optional abbreviated publication name.
publication: "*Proceedings of the ACM Web Conference 2024*, 2216-2225, doi:10.1145/3589334.3645621"
# publication_short: In *ICW*

abstract: "Continual Relation Extraction (CRE) has found widespread web applications (e.g., search engines) in recent times. One significant challenge in this task is the phenomenon of catastrophic forgetting, where models tend to forget earlier information. Existing approaches in this field predominantly rely on memory-based methods to alleviate catastrophic forgetting, which overlooks the inherent challenge posed by the varying memory requirements of different relations and the need for a suitable memory refreshing strategy. Drawing inspiration from the mechanisms of Dynamic Random Access Memory (DRAM), our study introduces a novel CRE architecture with an asynchronous refreshing strategy to tackle these challenges. We first design a DRAM-like architecture, comprising three key modules: perceptron, controller, and refresher. This architecture dynamically allocates memory, enabling the consolidation of well-remembered relations while allocating additional memory for revisiting poorly learned relations. Furthermore, we propose a compromising asynchronous refreshing strategy to find the pivot between over-memorization and overfitting, which focuses on the current learning task and mixed-memory data asynchronously. Additionally, we explain the existing refreshing strategies in CRE from the DRAM perspective. Our proposed method has experimented on two benchmarks and overall outperforms ConPL (the SOTA method) by an average of 1.50% on accuracy, which demonstrates the efficiency of the proposed architecture and refreshing strategy."

# Summary. An optional shortened abstract.
summary: WWW (Proceedings of the ACM Web Conference 2024)

tags:
  - Machine learning

# Display this page in the Featured widget?
featured: true

# Custom links (uncomment lines below)
# links:
# - name: Custom Link
#   url: http://example.org
links:
- name: Link
  url: https://dl.acm.org/doi/10.1145/3589334.3645621
url_pdf: uploads/WWW.pdf

# url_code: 'https://github.com/HugoBlox/hugo-blox-builder'
# url_dataset: 'https://github.com/HugoBlox/hugo-blox-builder'
# url_poster: ''
# url_project: ''
# url_slides: ''
# url_source: 'https://github.com/HugoBlox/hugo-blox-builder'
# url_video: 'https://dl.acm.org/doi/10.1145/3589334.3645621'

# Featured image
# To use, add an image named `featured.jpg/png` to your page's folder.
image:
  caption: 'Continual relation extraction model framework inspired by the DRAM structure. Left: Architecture of DRAM cell leakage current and refresh circuits in DRAM arrays.'
  focal_point: ''
  preview_only: true

# Associated Projects (optional).
#   Associate this publication with one or more of your projects.
#   Simply enter your project's folder or file name without extension.
#   E.g. `internal-project` references `content/project/internal-project/index.md`.
#   Otherwise, set `projects: []`.
# projects:
#   - example

# Slides (optional).
#   Associate this publication with Markdown slides.
#   Simply enter your slide deck's filename without extension.
#   E.g. `slides: "example"` references `content/slides/example/index.md`.
#   Otherwise, set `slides: ""`.
# slides: example
---
<!-- 
{{% callout note %}}
Click the _Cite_ button above to demo the feature to enable visitors to import publication metadata into their reference management software.
{{% /callout %}}

{{% callout note %}}
Create your slides in Markdown - click the _Slides_ button to check out the example.
{{% /callout %}}

Add the publication's **full text** or **supplementary notes** here. You can use rich formatting such as including [code, math, and images](https://docs.hugoblox.com/content/writing-markdown-latex/). -->

<!-- You can visit here for more information. -->