const fs = require('fs');
var fat = fs.readFileSync(__dirname + '/fat_test2.bin');
const BYTES_SECTOR = 512;

var hex = v=>v.toString(16).toUpperCase();
Object.prototype.offset = function(o, b){
	var buf = this.slice(o, o+b)
	var val = 0;
	for(var i=0; i<buf.length; i++){
		val += buf[i] << ((i)*8);
	}
	return val;
}

function readSector(sector){
	return Array.from(fat.slice(sector*BYTES_SECTOR, sector*(BYTES_SECTOR)+BYTES_SECTOR));
}

function buffToAscii(buffer){
	var str = "";
	for(var i of buffer){
		str += String.fromCharCode(i);
	}
	return str;
}

function parseLFN(data){
	var name1 = [...data.slice(1, 11)];
	var name2 = [...data.slice(14, 14+12)];
	var name3 = [...data.slice(28, 28+4)];
	return [...name1, ...name2, ...name3].filter(a=>a!=0x00 && a!=0xFF);
}

var head = readSector(0);
var sectorsPerCluster = head.offset(0x0D, 1);
var reservedSectors = head.offset(0x0E, 2);
var fatCount = head.offset(0x10, 1);
var sectorsPerFat = head.offset(0x024, 4);
var rootCluster = head.offset(0x02C, 4);

