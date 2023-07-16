# Goal

Try to add a Table of Contents (ToC) floating on the left side of the pandoc page.
Ideally, it would be collapsible, and would expand to show the current section as you scroll down or click around the page

## https://groups.google.com/g/pandoc-discuss/c/UKLTDhzqgM4?pli=1

### pandoc filter to generate:
https://github.com/simonmichael/hledger/blob/9c99dcde39a5c28b82f008615ff7370cbbad7922/site/hakyll-std/TableOfContents.hs

### float: left

`pandoc --toc -s in.md -o out.html`

will give you a `<div id="TOC">`.

You should be able to use CSS to style this so it acts as a
sidebar. Try something like

    div#TOC { float: left; margin: 1em; border: 1px solid gray;}

You can put your CSS in a file and use the --css option to
add a link to it, or you can use a custom template of
--include-in-header.

## https://groups.google.com/g/pandoc-discuss/c/bnwJlFFsmsk

```css
div#TOC {
  position: fixed;
  margin: 1em;
  padding: 1em;
  right: 2px;
  top: 2px;
  width: 500px; 
  height: 200px; 
  overflow: scroll;
  background-color: #EEEEEE;
  border: 1px solid black; }
```

*probably* `nav#TOC`

## https://groups.google.com/g/pandoc-discuss/c/mPqOznjpaj0/m/RcvrovCvBQAJ
Markdown -> docbook -> better ToC HTML?
http://www.sagehill.net/docbookxsl/TOCcontrol.html


## https://github.com/Mushiyo/pandoc-toc-sidebar
example: boring
https://mushiyo.github.io/pandoc-toc-sidebar/outWithTOC.html

# Implement it through custom HTML

## https://stackoverflow.com/a/59570768/771768
`// intelligent scrolling of the sidebar content`

## https://css-tricks.com/sticky-table-of-contents-with-scrolling-active-states/
The demo looks nice. Doesn't seem to expand/contract, though
blog: https://www.bram.us/2020/01/10/smooth-scrolling-sticky-scrollspy-navigation/

Smooth scrolling looks nice:
```css
html {
	scroll-behavior: smooth;
}
```

## bootstrap

https://stackoverflow.com/questions/49353477/how-to-make-automatic-navbar-based-on-section-of-a-webpage

Libary has this: https://getbootstrap.com/docs/4.1/components/scrollspy/
