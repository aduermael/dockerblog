package main

import (
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
)

const (
	blogDataRootDir = "/blog-data"
	initialDataDir  = "/initial-data"
)

// override: prefixes of paths to be overridden
func installInitialData(overrides []string) {

	// remove all files that are supposed to be overridden
	// (we don't want to keep existing ones)
	for _, override := range overrides {
		fPath := filepath.Join(blogDataRootDir, override)
		err := os.RemoveAll(fPath)
		if err != nil {
			log.Fatalln("can't remove files to be overridden:", err)
		}
	}

	fmt.Println("installInitialData Walk:")

	filepath.Walk(initialDataDir, func(path string, info os.FileInfo, err error) error {

		dst := strings.TrimPrefix(path, initialDataDir)
		dst = filepath.Join(blogDataRootDir, dst)

		fmt.Println(dst)

		srcFileStat, statErr := os.Stat(path)
		if statErr != nil {
			log.Fatal(err)
		}

		if srcFileStat.IsDir() {
			mkdirErr := os.MkdirAll(dst, os.ModePerm)
			if mkdirErr != nil {
				log.Fatal(err)
			}
			return nil
		}

		// don't overwrite existing files
		// only copy initial files there's no
		// no file at destination already
		_, statErr = os.Stat(dst)
		if statErr == nil || os.IsNotExist(statErr) == false {
			fmt.Println("file exists at destination")
			return nil
		}

		srcFile, err := os.Open(path)
		if err != nil {
			log.Fatal(err)
		}
		defer srcFile.Close()

		dstFile, err := os.Create(dst)
		if err != nil {
			log.Fatal(err)
		}
		defer dstFile.Close()

		_, err = io.Copy(dstFile, srcFile) // first var shows number of bytes
		if err != nil {
			log.Fatal(err)
		}

		err = dstFile.Sync()
		if err != nil {
			log.Fatal(err)
		}

		return nil
	})
}
