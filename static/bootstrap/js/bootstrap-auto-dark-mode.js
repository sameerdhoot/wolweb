/*
* Automated Bootstrap 5 Dark Mode
*
* Additional support for an automated toggle based on browser's system attributes
*/

;(function () {
    const htmlElement = document.querySelector("html")
    if(htmlElement.getAttribute("data-bs-theme") === 'auto') {
      function updateTheme() {
        document.querySelector("html").setAttribute("data-bs-theme",
        window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      }
       window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateTheme)
      updateTheme()
    }
  })()