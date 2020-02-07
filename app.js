const fs = require('fs');
var fat = fs.readFileSync(__dirname + '/fat_test.bin');

function readBuffer(offset, bytes, reverse=true){
	var sa = fat.subarray(offset, offset+bytes)
	return reverse ? sa.reverse() : sa;
}

function readHex(offset, bytes, little=true, separation=false){
	var bytes_read = readBuffer(offset, bytes, little);
	var str = [];
	for(var i of bytes_read){
		str.push(('00'+i.toString(16)).slice(-2));
	}
	return str.join(separation ? ' ' : '');
}

function readBinary(offset, bytes, little=true, separation=false){
	var bytes_read = readBuffer(offset, bytes, little);
	var str = [];
	for(var i of bytes_read){
		str.push(('0000'+i.toString(2)).slice(-8));
	}
	return str.join(separation ? ' ' : '');
}

function readInt(offset, bytes){
	return parseInt(readHex(offset, bytes).replace(/ /g, ''), 16);
}

function buffToAscii(buffer){
	var str = "";
	for(var i of buffer){
		str += String.fromCharCode(i);
	}
	return str;
}

function readAscii(offset, bytes){
	var read = readBuffer(offset, bytes).reverse();
	return buffToAscii(read)
}

var numOfSectors = readInt(32, 4);
var bytesPerSector = readInt(11, 2);
var sectorsPerCluster = readInt(13, 1);
var rootCluster = readInt(44, 4);
var reservedSectors = readInt(0x0E, 2);
var numberOfFAT = readInt(0x10, 1);
var sectorsPerFat = readInt(0x024, 4);

var FATSector = reservedSectors;

var clusterToSector = (n)=>(n-2)*sectorsPerCluster + reservedSectors+(numberOfFAT*sectorsPerFat);

var rootSector = clusterToSector(rootCluster);
var dir = 0;
while(true){
	var itemDir = rootSector*bytesPerSector+(dir*32);
	var item = readBuffer(itemDir, 32, false);
	if(item[0]==0x00) break;

	if(item[11]!=0x20){
		dir += 1;
		continue;
	}
	if(item[11]==0x0F){
		console.log("LONG NAME");
	}
	var fileSize = readInt(itemDir+28, 4);
	var name = readAscii(itemDir, 11)
	var firstClustHigh = readHex(itemDir+20, 2);
	var firstClustLow = readHex(itemDir+26, 2);
	var firstClust = parseInt(`${firstClustHigh}${firstClustLow}`, 16);
	var fileSectorStart = clusterToSector(firstClust)*bytesPerSector;

	var crtDate = readBinary(itemDir+16, 2);
	var date = {
		year: 1980 + parseInt(crtDate.substr(0, 7), 2),
		month: parseInt(crtDate.substr(7, 4), 2),
		day: parseInt(crtDate.substr(11, 5), 2)
	}

	var crtTime = readBinary(itemDir+14, 2);
	var time = {
		hour: parseInt(crtTime.substr(0, 5), 2),
		min: parseInt(crtTime.substr(5, 6), 2),
		sec: parseInt(crtTime.substr(11, 5), 2)*2
	}
	
	console.log(name.substr(0, 8).trim()+'.'+name.substr(-3))
	console.log(" => File Size:\t\t", fileSize, 'Bytes');
	console.log(" => Byte Offset:\t", fileSectorStart);
	console.log(" => Creation:\t\t", `${date.year}-${date.month}-${date.day}`)
	console.log(" => Creation Time:\t", `${('00'+time.hour).slice(-2)}:${('00'+time.min).slice(-2)}:${('00'+time.sec).slice(-2)}`)
	dir += 1;
}
