package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
)

func loadData() {
	// Read data from 'devices.json' file

	devicesFile, fileErr := os.Open(args.DevicesPath)
	if fileErr != nil {
		log.Fatalf("Error loading devices.json file. \"%s\"", fileErr)
	}

	devicesDecoder := json.NewDecoder(devicesFile)
	decodeErr := devicesDecoder.Decode(&appData)
	if decodeErr != nil {
		log.Fatalf("Error decoding devices.json file. \"%s\"", decodeErr)
	}

	log.Printf("Application data loaded from devices.json")
	log.Println(" - devices defined in devices.json: ", len(appData.Devices))
	devicesFile.Close()
}

func saveData(w http.ResponseWriter, r *http.Request) {
	// Wrtie data to 'devices.json' file

	w.Header().Set("Content-Type", "application/json")
	var result HTTPResponseObject

	log.Printf("New Application data received for saving to disk")
	file, fileErr := os.OpenFile("devices.json", os.O_WRONLY|os.O_CREATE|os.O_TRUNC, os.ModePerm)
	decoderErr := json.NewDecoder(r.Body).Decode(&appData)

	baseErrStr := "Unable to save data to disk. "

	if fileErr != nil {
		result.Success = false
		result.ErrorObject = fileErr
		// http.Error(w, err.Error(), http.StatusBadRequest)

		log.Printf(" - Issues saving application data")

		// Attempt to match raised exception against common errors
		if os.IsPermission(fileErr) {
			result.Message = baseErrStr + "Ensure you have appropriate permissions to write to 'device.json'."
		} else if os.IsNotExist(fileErr) {
			result.Message = baseErrStr + "Ensure you have a 'devices.json' file present to store data."
		} else {
			// Return generic error object if no matching case was found
			result.Message = baseErrStr + fileErr.Error()
		}
	} else if decoderErr != nil {
		result.Success = false
		result.ErrorObject = decoderErr
		result.Message = baseErrStr + "The device data received by the API was invalid."
		log.Printf(" - Issues decoding application data")
	} else {
		encoder := json.NewEncoder(file)
		encoder.SetIndent("", "    ")
		encoder.Encode(appData)

		result.Success = true
		result.Message = "Devices data saved to devices.json file. There are now " + strconv.Itoa(len(appData.Devices)) + " device(s) defined in the list."
		log.Printf(" - New application data saved to file devices.json")
	}

	//
	json.NewEncoder(w).Encode(result)
	file.Close()
}

func getData(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(appData)
	log.Printf("Request for Application data served")

}
