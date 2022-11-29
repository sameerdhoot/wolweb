package main

import (
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
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

	// Setup IP whitelist
	router.Use(ipMiddleware)

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

func ipMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clientIP := strings.Split(r.RemoteAddr, ":")[0]

		_, subnet, err := net.ParseCIDR(appConfig.AllowedSubnet)
		if err != nil {
			log.Fatal(err)
		}

		if !subnet.Contains(net.ParseIP(clientIP)) {
			http.Error(w, "Forbidden", http.StatusForbidden)
			w.WriteHeader(http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}
