package main

// Taken from https://github.com/sabhiram/go-wol

import (
	"bytes"
	"encoding/binary"
	"errors"
	"log"
	"net"
	"regexp"
)

// Define globals for the MacAddress parsing
var (
	delims = ":-"
	reMAC  = regexp.MustCompile(`^([0-9a-fA-F]{2}[` + delims + `]){5}([0-9a-fA-F]{2})$`)
)

// MACAddress define construct for MAC Address
type MACAddress [6]byte

// A MagicPacket is constituted of 6 bytes of 0xFF followed by
// 16 groups of the destination MAC address.
type MagicPacket struct {
	header  [6]byte
	payload [16]MACAddress
}

// NewMagicPacket function accepts a MAC Address string, and returns a pointer to
// a MagicPacket object. A Magic Packet is a broadcast frame which
// contains 6 bytes of 0xFF followed by 16 repetitions of a given mac address.
func NewMagicPacket(mac string) (*MagicPacket, error) {
	var packet MagicPacket
	var macAddr MACAddress

	// We only support 6 byte MAC addresses since it is much harder to use
	// the binary.Write(...) interface when the size of the MagicPacket is
	// dynamic.
	if !reMAC.MatchString(mac) {
		return nil, errors.New("MAC address " + mac + " is not valid.")
	}

	hwAddr, err := net.ParseMAC(mac)
	if err != nil {
		return nil, err
	}

	// Copy bytes from the returned HardwareAddr -> a fixed size
	// MACAddress
	for idx := range macAddr {
		macAddr[idx] = hwAddr[idx]
	}

	// Setup the header which is 6 repetitions of 0xFF
	for idx := range packet.header {
		packet.header[idx] = 0xFF
	}

	// Setup the payload which is 16 repetitions of the MAC addr
	for idx := range packet.payload {
		packet.payload[idx] = macAddr
	}

	return &packet, nil
}

// GetIPFromInterface function get IP Address of interface
func GetIPFromInterface(iface string) (*net.UDPAddr, error) {
	ief, err := net.InterfaceByName(iface)
	if err != nil {
		return nil, err
	}

	addrs, err := ief.Addrs()
	if err != nil {
		return nil, err
	} else if len(addrs) <= 0 {
		return nil, errors.New("No address associated with interface " + iface)
	}

	// Validate that one of the addr's is a valid network IP address
	for _, addr := range addrs {
		switch ip := addr.(type) {
		case *net.IPNet:
			// Verify that the DefaultMask for the address we want to use exists
			if ip.IP.DefaultMask() != nil {
				return &net.UDPAddr{
					IP: ip.IP,
				}, nil
			}
		}
	}
	return nil, errors.New("Unable to find valid IP addr for interface " + iface)
}

// SendMagicPacket to send a magic packet to a given mac address, and optionally
// receives an iface to broadcast on. An iface of "" implies a nil net.UDPAddr
func SendMagicPacket(macAddr, bcastAddr, iface string) error {
	// Construct a MagicPacket for the given MAC Address
	magicPacket, err := NewMagicPacket(macAddr)
	if err != nil {
		return err
	}

	// Fill our byte buffer with the bytes in our MagicPacket
	var buf bytes.Buffer
	binary.Write(&buf, binary.BigEndian, magicPacket)
	log.Printf("Attempting to send a magic packet to MAC %s\n", macAddr)
	log.Printf("... Broadcasting to: %s\n", bcastAddr)

	// Get a UDPAddr to send the broadcast to
	udpAddr, err := net.ResolveUDPAddr("udp", bcastAddr)
	if err != nil {
		log.Printf("Unable to get a UDP address for %s\n", bcastAddr)
		return err
	}

	// If an interface was specified, get the address associated with it
	var localAddr *net.UDPAddr
	if iface != "" {
		var err error
		localAddr, err = GetIPFromInterface(iface)
		if err != nil {
			log.Printf("ERROR: %s\n", err.Error())
			return errors.New("Unable to get address for interface " + iface)
		}
	}

	// Open a UDP connection, and defer it's cleanup
	connection, err := net.DialUDP("udp", localAddr, udpAddr)
	if err != nil {
		log.Printf("ERROR: %s\n", err.Error())
		return errors.New("unable to dial UDP address")
	}
	defer connection.Close()

	// Write the bytes of the MagicPacket to the connection
	bytesWritten, err := connection.Write(buf.Bytes())
	if err != nil {
		log.Printf("Unable to write packet to connection\n")
		return err
	} else if bytesWritten != 102 {
		log.Printf("Warning: %d bytes written, %d expected!\n", bytesWritten, 102)
	}

	return nil
}
