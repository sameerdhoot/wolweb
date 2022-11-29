package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/ilyakaznacheev/cleanenv"
)

// Global variables
var appConfig AppConfig
var appData AppData

func main() {

	setWorkingDir()

	loadConfig()

	loadData()

	setupWebServer()

}

func setWorkingDir() {

	thisApp, err := os.Executable()
	if err != nil {
		log.Fatalf("Error determining the directory. \"%s\"", err)
	}
	appPath := filepath.Dir(thisApp)
	os.Chdir(appPath)
	log.Printf("Set working directory: %s", appPath)

}

func loadConfig() {

	err := cleanenv.ReadConfig("config.json", &appConfig)
	if err != nil {
		log.Fatalf("Error loading config.json file. \"%s\"", err)
	}
	log.Printf("Application configuratrion loaded from config.json")

}

func setupWebServer() {

	// Init HTTP Router - mux
	router := mux.NewRouter()

	// Define base path. Keep it empty when VDir is just "/" to avoid redirect loops
	// Add trailing slash if basePath is not empty
	basePath := ""
	if appConfig.VDir != "/" {
		basePath = appConfig.VDir
		router.HandleFunc(basePath, redirectToHomePage).Methods("GET")
	}

	// map directory to server static files
	router.PathPrefix(basePath + "/static/").Handler(http.StripPrefix(basePath+"/static/", http.FileServer(http.Dir("./static"))))

	// Define Home Route
	router.HandleFunc(basePath+"/", renderHomePage).Methods("GET")

	// Define Wakeup functions with a Device Name
	router.HandleFunc(basePath+"/wake/{deviceName}", wakeUpWithDeviceName).Methods("GET")
	router.HandleFunc(basePath+"/wake/{deviceName}/", wakeUpWithDeviceName).Methods("GET")

	// Define Data save Api function
	router.HandleFunc(basePath+"/data/save", saveData).Methods("POST")

	// Define Data get Api function
	router.HandleFunc(basePath+"/data/get", getData).Methods("GET")

	// Define health check function
	router.HandleFunc(basePath+"/health", checkHealth).Methods("GET")

	// Setup Webserver
	httpListen := ":" + strconv.Itoa(appConfig.Port)
	log.Printf("Startup Webserver on \"%s\"", httpListen)

	srv := &http.Server{
		Handler: handlers.RecoveryHandler(handlers.PrintRecoveryStack(true))(router),
		Addr:    httpListen,
		// Good practice: enforce timeouts for servers you create!
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	log.Fatal(srv.ListenAndServe())

}
