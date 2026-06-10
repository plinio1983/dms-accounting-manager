#!/bin/bash

echo Example:
echo "==============================================="
echo npm run import:expenses -- ./file.xlsx --clear
echo "==============================================="

IMPORTFILE=$1
OPT=$2
npm run import:expenses -- $IMPORTFILE --$OPT