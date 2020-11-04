package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
)

func loadData() {

	devicesFile, err := os.Open("devices.json")
	if err != nil {
		log.Fatalf("Error loading devices.json file. \"%s\"", err)
	}
	devicesDecoder := json.NewDecoder(devicesFile)
	err = devicesDecoder.Decode(&appData)
	if err != nil {
		log.Fatalf("Error decoding devices.json file. \"%s\"", err)
	}
	log.Printf("Application data loaded from devices.json")
	log.Println(" - devices defined in devices.json: ", len(appData.Devices))

}

func saveData(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")
	var result HTTPResponseObject

	log.Printf("New Application data received for saving to disk")
	err := json.NewDecoder(r.Body).Decode(&appData)
	if err != nil {
		// http.Error(w, err.Error(), http.StatusBadRequest)
		result.Success = false
		result.Message = "Colud not save the data. " + err.Error()
		result.ErrorObject = err
		log.Printf(" - Issues decoding/saving application data")
	} else {
		file, _ := os.OpenFile("devices.json", os.O_RDWR|os.O_CREATE|os.O_TRUNC, os.ModePerm)
		defer file.Close()

		encoder := json.NewEncoder(file)
		encoder.SetIndent("", "    ")
		encoder.Encode(appData)

		result.Success = true
		result.Message = "devices data saved to devices.json file. There are now " + strconv.Itoa(len(appData.Devices)) + " device defined in the list."
		log.Printf(" - New application data saved to file devices.json")
	}
	json.NewEncoder(w).Encode(result)

}

func getData(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(appData)
	log.Printf("Request for Application data served")

}
