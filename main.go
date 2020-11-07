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

	// map directory to server static files
	router.PathPrefix(appConfig.VDir + "/static/").Handler(http.StripPrefix(appConfig.VDir+"/static/", http.FileServer(http.Dir("./static"))))

	// Define Home Route
	router.HandleFunc(appConfig.VDir, redirectToHomePage).Methods("GET")
	router.HandleFunc(appConfig.VDir+"/", renderHomePage).Methods("GET")

	// Define Wakeup functions with a Device Name
	router.HandleFunc(appConfig.VDir+"/wake/{deviceName}", wakeUpWithDeviceName).Methods("GET")
	router.HandleFunc(appConfig.VDir+"/wake/{deviceName}/", wakeUpWithDeviceName).Methods("GET")

	// Define Data save Api function
	router.HandleFunc(appConfig.VDir+"/data/save", saveData).Methods("POST")

	// Define Data get Api function
	router.HandleFunc(appConfig.VDir+"/data/get", getData).Methods("GET")

	// Define health check function
	router.HandleFunc(appConfig.VDir+"/health", checkHealth).Methods("GET")

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
