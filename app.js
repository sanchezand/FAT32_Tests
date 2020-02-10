const fs = require('fs');
var fat = fs.readFileSync(__dirname + '/fat_test2.bin');

function readBuffer(offset, bytes, reverse=true){
	var sa = [...fat.subarray(offset, offset+bytes)]
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

function parseLFN(data){
	var name1 = [...data.slice(1, 11)];
	var name2 = [...data.slice(14, 14+12)];
	var name3 = [...data.slice(28, 28+4)];
	return [...name1, ...name2, ...name3].filter(a=>a!=0x00 && a!=0xFF);
}


var numOfSectors = readInt(32, 4);
var sectorsPerCluster = readInt(13, 1);
var bytesPerSector = readInt(11, 2);
var rootCluster = readInt(44, 4);
var reservedSectors = readInt(0x0E, 2);
var numberOfFAT = readInt(0x10, 1);
var sectorsPerFat = readInt(0x024, 4);

var clusterToSector = (n)=>(n-2)*sectorsPerCluster + reservedSectors+(numberOfFAT*sectorsPerFat);
var sectorToCluster = (s)=>((s-(numberOfFAT*sectorsPerFat)-reservedSectors)/sectorsPerCluster)+2

var maxClusters = sectorToCluster(numOfSectors);
var rootSector = clusterToSector(rootCluster);

var getClusterFAT = (c)=>(c*4)%bytesPerSector;

function getNextCluster(cluster){
	var clusterFAT = (cluster*4) % bytesPerSector;
	var fatVal = readInt((reservedSectors*bytesPerSector)+clusterFAT, 4, false);
	if(fatVal>maxClusters){
		console.log("NO NEXT CLUSTER");
		return false;
	}
	return fatVal+cluster
	// console.log(fatVal);
}


var rootClusterFAT = readInt(reservedSectors*bytesPerSector+getClusterFAT(rootCluster), 4);
// console.log(hasNextCluster(rootCluster), getClusterFAT(rootCluster))
// console.log(rootClusterFAT.toString(16), "ROOT NEXT SECTOR", ((rootClusterFAT & 0x0FFFFFFF)*sectorsPerCluster)+rootSector-2)
var dir = 0;

function readSectorDir(sector){
	while(true){
		var itemDir = sector*bytesPerSector+(dir*32);
		var item = readBuffer(itemDir, 32, false);
		var attr = item[11];
		if(item[0]==0x00){
			// var currentCluster = sectorToCluster(((itemDir-(dir*32))/bytesPerSector));
			// var nextCluster = getNextCluster(currentCluster);
			// console.log(sector+nextCluster);
			
			// if(nextCluster!==false){
			// 	sector = sector+clusterToSector(nextCluster)
			// 	dir = 0;
			// 	continue;
			// }else break;
			break;
		}
		var name = "", extension = "", lfn = false;
		if(attr!=0x0F){
			name = readAscii(itemDir, 8)
			extension = readAscii(itemDir+8, 3);
		}
		while(attr==0x0F){
			lfn = true;
			name = buffToAscii(parseLFN(item)) + name;
			dir += 1;
			itemDir = rootSector*bytesPerSector+(dir*32);
			item = readBuffer(itemDir, 32, false);
			attr = item[11];
		}
		if(attr!=0x20){
			dir += 1;
			continue;
		}
		
		var fileSize = readInt(itemDir+28, 4);
		var firstClustHigh = readInt(itemDir+20, 2);
		var firstClustLow = readInt(itemDir+26, 2);
		var firstClust = (firstClustHigh << 16) + firstClustLow
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
		console.log(lfn ? name : name.trim()+'.'+extension.trim())
		console.log(" => File Size:\t\t", fileSize, 'Bytes');
		console.log(" => Attribute:\t\t", ('00'+attr.toString(16).toUpperCase()).slice(-2));
		console.log(" => Sector:\t\t", clusterToSector(firstClust));
		console.log(" => Byte Offset:\t", fileSectorStart);
		console.log(" => Creation:\t\t", `${date.year}-${date.month}-${date.day}`)
		console.log(" => Creation Time:\t", `${('00'+time.hour).slice(-2)}:${('00'+time.min).slice(-2)}:${('00'+time.sec).slice(-2)}`)
		dir += 1;
	}
}

readSectorDir(rootSector);