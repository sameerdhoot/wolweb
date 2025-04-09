package main

import (
	_ "embed"
	"html/template"
	"io"
	"log"
	"net/http"
)

//go:embed index.html
var indexHtml string

func renderHomePage(w http.ResponseWriter, r *http.Request) {

	pageData := struct {
		Devices  []Device
		VDir     string
		BCastIP  string
		ReadOnly bool
	}{
		Devices:  appData.Devices,
		VDir:     appConfig.VDir,
		BCastIP:  appConfig.BCastIP,
		ReadOnly: appConfig.ReadOnly,
	}
	if appConfig.VDir == "/" {
		pageData.VDir = ""
	}
	tmpl, _ := template.New("index.html").Parse(indexHtml)
	tmpl.Execute(w, pageData)
	log.Println("Renedered the home page.")

}

func redirectToHomePage(w http.ResponseWriter, r *http.Request) {

	http.Redirect(w, r, appConfig.VDir+"/", http.StatusFound)

}

func checkHealth(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "text/html")
	io.WriteString(w, "alive")

}
