package main

import (
	"flag"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/NYTimes/gziphandler"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/ilyakaznacheev/cleanenv"
)

// Global variables
var appConfig AppConfig
var appData AppData
var args Args

type Args struct {
	ConfigPath string
	DevicesPath string
}

func main() {
	processArgs()
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

	err := cleanenv.ReadConfig(args.ConfigPath, &appConfig)
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
	router.PathPrefix(basePath + "/static/").Handler(http.StripPrefix(basePath+"/static/", CacheControlWrapper(http.FileServer(http.Dir("./static")))))

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
	httpListen := net.ParseIP(appConfig.Host).String() + ":" + strconv.Itoa(appConfig.Port)
	log.Printf("Startup Webserver on \"%s\"", httpListen)

	srv := &http.Server{
		Handler: gziphandler.GzipHandler(handlers.RecoveryHandler(handlers.PrintRecoveryStack(true))(router)),
		Addr:    httpListen,
		// Good practice: enforce timeouts for servers you create!
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	log.Fatal(srv.ListenAndServe())

}

func CacheControlWrapper(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "max-age=31536000")
		h.ServeHTTP(w, r)
	})
}

func processArgs() {
	var configPath string
	var devicesPath string

	f := flag.NewFlagSet("wolweb", 1)

	f.StringVar(&configPath, "c", "config.json", "Path to configuration file")
	f.StringVar(&devicesPath, "d", "devices.json", "Path to devices file")

	f.Parse(os.Args[1:])

	configPath, err := filepath.Abs(configPath)
	if err != nil {
		log.Fatal(err)
	}

	devicesPath, err = filepath.Abs(devicesPath)
	if err != nil {
		log.Fatal(err)
	}

	args.ConfigPath = configPath
	args.DevicesPath = devicesPath
}
