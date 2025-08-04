package main

import (
	"context"
	"embed"
	"errors"
	"flag"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"syscall"
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

//go:embed static
var staticFiles embed.FS

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
	var staticFS = fs.FS(staticFiles)
	staticFS, err := fs.Sub(staticFS, "static")
	if err != nil {
		panic(err)
	}
	router.PathPrefix(basePath + "/static/").Handler(http.StripPrefix(basePath+"/static/", CacheControlWrapper(http.FileServer(http.FS(staticFS)))))

	// Define Home Route
	router.HandleFunc(basePath+"/", renderHomePage).Methods("GET")

	// Define Wakeup functions with a Device Name
	router.HandleFunc(basePath+"/wake/{deviceName}", wakeUpWithDeviceName).Methods("GET")
	router.HandleFunc(basePath+"/wake/{deviceName}/", wakeUpWithDeviceName).Methods("GET")

	if appConfig.ReadOnly == false {
		// Define Data save Api function
		router.HandleFunc(basePath+"/data/save", saveData).Methods("POST")
	}

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

	go func() {
		err := srv.ListenAndServe()
		if !errors.Is(err, http.ErrServerClosed) {
				log.Fatalf("HTTP server error: %v", err)
		}
		log.Println("Stopped serving new connections.")
	}()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	shutdownCtx, shutdownRelease := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownRelease()

	err = srv.Shutdown(shutdownCtx)
	if err != nil {
			log.Fatalf("HTTP shutdown error: %v", err)
	}
	log.Println("Graceful shutdown complete.")

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

	log.Printf("configuration file path: %s", configPath)
	log.Printf("devices file path: %s", configPath)

	args.ConfigPath = configPath
	args.DevicesPath = devicesPath
}
