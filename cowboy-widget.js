// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: pink; icon-glyph: bicycle;
// parsing widget parameters for username and password
let email
let password
const param = args.widgetParameter;
if (param != null && param.length > 0) {
	if (param.indexOf(";") > 0) {
		email = param.substring(0, param.indexOf(';')).trim();
		password = param.substring(param.indexOf(';') + 1).trim();
	} else {
		console.log("Error reading user credentials.")
	}
}

// widget colors
const labelColor = new Color('#fb3464') // widget label color
const textColor = new Color('#34443c') // widget text color

// battery circle graphics
const canvSize = 200;
const canvTextSize = 80;
const canvas = new DrawContext();
canvas.opaque = false;
const battCircleRemainColor = new Color("#fb3464"); // battery remaining color
const battCircleDepletedColor = new Color("#E3e3dc"); // battery depleted color
const battCircleBGColor = new Color('#fff'); // battery circle background color
const canvWidth = 16; // battery circle thickness
const canvRadius = 80; // battery circle radius
canvas.size = new Size(canvSize, canvSize);
canvas.respectScreenScale = true;

let widget = new ListWidget()
widget.url = "shortcuts://run-shortcut?name=unlock-cowboy"
let clientId
let uid
let accessToken
let bikeId

let success = false
// check existence of username and password
if (isNotEmpty(email) && isNotEmpty(password)) {
	let cowboyCredentials = await getCowboyCredentials(false)
	if (cowboyCredentials) {
		success = true
		clientId = cowboyCredentials.client
		uid = cowboyCredentials.uid
		accessToken = cowboyCredentials.accessToken
		bikeId = cowboyCredentials.bikeId
		widget = await createWidget()
	}
}
if (!success) {
	// show error
	let cowboyIcon = await getImage("cowboy.png")
	let cowboyIconImage = widget.addImage(cowboyIcon)
	cowboyIconImage.imageSize = new Size(70, 14)
	cowboyIconImage.centerAlignImage()
	widget.addSpacer()
	let warningTxt = widget.addText("Couldn't read username and password. Please set it as widget parameter, separated by semicolon!")
	warningTxt.font = Font.semiboldSystemFont(12)
	warningTxt.textColor = textColor
	warningTxt.centerAlignText()
}
Script.setWidget(widget)
Script.complete()

widget.presentSmall()

async function createWidget() {

	let cowboyIcon = await getImage("cowboy.png")
	// 	widget.backgroundColor = new Color("#768178")

	let bike = await getBikeInfo()

	if (bike) {

		const batteryLevel = bike.battery_state_of_charge;

		widget.setPadding(10, 10, 8, 8)

		let batteryStack = widget.addStack()

		drawArc(
			Math.floor(batteryLevel * 3.6),
			battCircleRemainColor,
			battCircleDepletedColor,
			"🔋"
		)

		batteryStack.addImage(canvas.getImage())
		batteryStack.addSpacer(6)

		let infoStack = batteryStack.addStack()
		infoStack.layoutVertically()
		infoStack.addSpacer(12)
		let cowboyIconImage = infoStack.addImage(cowboyIcon)
		cowboyIconImage.imageSize = new Size(70, 14)
		cowboyIconImage.centerAlignImage()
		infoStack.addSpacer(4)

		let percentageText = infoStack.addText(batteryLevel.toString() + "%")
		percentageText.font = Font.mediumRoundedSystemFont(20)
		if (batteryLevel < 21) {
			console.log("battery level is low")
			percentageText.textColor = new Color("#fb3464")
		} else {
			percentageText.textColor = new Color("#fb3464")
		}

		widget.addSpacer(3)

		let detailsStack = widget.addStack()
		detailsStack.layoutHorizontally()

		let distanceStack = detailsStack.addStack()
		distanceStack.layoutVertically()

		let totalDistance = distanceStack.addText("DISTANCE")
		totalDistance.font = Font.boldSystemFont(10)
		totalDistance.textColor = labelColor
		totalDistance.textOpacity = 0.8

		let totalDistaneNo = distanceStack.addText(Math.round(bike.total_distance).toLocaleString() + ' KM')
		totalDistaneNo.font = Font.boldSystemFont(11)
		totalDistaneNo.textColor = textColor

		detailsStack.addSpacer()

		let co2Stack = detailsStack.addStack()
		co2Stack.layoutVertically()

		let totalCo2Saved = co2Stack.addText("CO₂ SAVED")
		totalCo2Saved.font = Font.boldSystemFont(10)
		totalCo2Saved.textColor = labelColor
		totalCo2Saved.textOpacity = 0.8

		let totalCo2SavedNo = co2Stack.addText((bike.total_co2_saved / 1000).toFixed(1).toLocaleString() + ' KG')
		totalCo2SavedNo.font = Font.semiboldSystemFont(11)
		totalCo2SavedNo.textColor = textColor

		widget.addSpacer(4)

		let locationText = widget.addText("LOCATION")
		locationText.font = Font.boldSystemFont(10)
		locationText.textColor = labelColor
		locationText.textOpacity = 0.8

		const geoPosition = bike.position.address.split(", ")
		let geoPositionStreetTxt = widget.addText(geoPosition[0].replace("straße", "str."))
		geoPositionStreetTxt.font = Font.semiboldSystemFont(12)
		geoPositionStreetTxt.textColor = textColor
		geoPositionStreetTxt.lineLimit = 1
		geoPositionStreetTxt.minimumScaleFactor = 0.8
		let geoPositionCityTxt = widget.addText(geoPosition[1])
		geoPositionCityTxt.font = Font.semiboldSystemFont(12)
		geoPositionCityTxt.textColor = textColor
		geoPositionCityTxt.lineLimit = 1

	} else {
		let cowboyIconImage = widget.addImage(cowboyIcon)
		cowboyIconImage.imageSize = new Size(70, 14)
		cowboyIconImage.centerAlignImage()

		widget.addSpacer()

		let warningTxt = widget.addText("Error getting data, please double check your credentials.")
		warningTxt.font = Font.semiboldSystemFont(12)
		warningTxt.textColor = textColor
		warningTxt.centerAlignText()
	}
	return widget
}

// get images from local filestore or download them once
async function getImage(image) {
	let fm = FileManager.local()
	let dir = fm.documentsDirectory()
	let path = fm.joinPath(dir, image)
	if (fm.fileExists(path)) {
		return fm.readImage(path)
	} else {
		// download once
		let imageUrl
		switch (image) {
			case 'cowboy.png':
				imageUrl = "https://i.imgur.com/6lFsyTZ.png"
				break
			default:
				console.log(`Sorry, couldn't find ${image}.`);
		}
		let iconImage = await loadImage(imageUrl)
		fm.writeImage(path, iconImage)
		return iconImage
	}
}

// helper function to download an image from a given url
async function loadImage(imgUrl) {
	const req = new Request(imgUrl)
	return await req.loadImage()
}

// query bike data from cowboy api
async function getBikeInfo() {

	let bikeApiUrl = "https://app-api.cowboy.bike/bikes/" + bikeId
	const appToken = atob("ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5")

	req = new Request(bikeApiUrl)
	req.headers = {
		"X-Cowboy-App-Token": appToken,
		"Content-Type": "application/json",
		"Client": clientId,
		"Uid": uid,
		"Access-Token": accessToken
	}

	let result = await req.loadJSON()

	// check if api call has been successful
	if (req.response.statusCode == 200) {
		console.log("Successfully retrieved bike data! Result: " + JSON.stringify(result))
		return result
	} else if (req.response.statusCode == 401) {
		console.log("Unauthorized - access token seems to be expired. Trying to reauthorize.")
		// reauthorize and store new access token
		let refreshedCredentials = await getCowboyCredentials(true)
		req = new Request(bikeApiUrl)
		req.headers = {
			"X-Cowboy-App-Token": appToken,
			"Content-Type": "application/json",
			"Client": refreshedCredentials.client,
			"Uid": refreshedCredentials.uid,
			"Access-Token": refreshedCredentials.accessToken
		}
		result = await req.loadJSON()
		if (req.response.statusCode == 200) {
			return result
		}
	}
	return null
}

function sinDeg(deg) {
	return Math.sin((deg * Math.PI) / 180);
}

function cosDeg(deg) {
	return Math.cos((deg * Math.PI) / 180);
}

function drawArc(deg, fillColor, strokeColor, label) {
	let ctr = new Point(canvSize / 2, canvSize / 2),
		bgx = ctr.x - canvRadius;
	bgy = ctr.y - canvRadius;
	bgd = 2 * canvRadius;
	bgr = new Rect(bgx, bgy, bgd, bgd);

	canvas.opaque = false;

	canvas.setFillColor(fillColor);
	canvas.setStrokeColor(strokeColor);
	canvas.setLineWidth(canvWidth);
	canvas.strokeEllipse(bgr);

	for (t = 0; t < deg; t++) {
		rect_x = ctr.x + canvRadius * sinDeg(t) - canvWidth / 2;
		rect_y = ctr.y - canvRadius * cosDeg(t) - canvWidth / 2;
		rect_r = new Rect(rect_x, rect_y, canvWidth, canvWidth);
		canvas.fillEllipse(rect_r);
	}
	// attempt to draw label/icon
	const canvLabelRect = new Rect(
		0,
		(100 - canvTextSize / 2) - 8,
		canvSize,
		200
	);
	canvas.setTextAlignedCenter();
	canvas.setFont(Font.boldSystemFont(canvTextSize));
	canvas.drawTextInRect(label, canvLabelRect);
	// return canvas.getImage()
}

// obtain cowboy api credentials - either cached or new
async function getCowboyCredentials(forceRefresh) {
	// load credentials from local storage
	let fm = FileManager.local()
	let dir = fm.documentsDirectory()
	let path = fm.joinPath(dir, "cowboy-credentials.json")

	let cowboyCredentials
	if (fm.fileExists(path) && !forceRefresh) {
		let cowboyCredentialsFile = Data.fromFile(path)
		cowboyCredentials = JSON.parse(cowboyCredentialsFile.toRawString())
		if (isNotEmpty(cowboyCredentials.accessToken)
			&& isNotEmpty(cowboyCredentials.client)
			&& isNotEmpty(cowboyCredentials.uid)) {
			return cowboyCredentials
		}
	}
	console.log("Cowboy credentials either don't exist or refresh was forced. Obtaining new credentials.")
	cowboyCredentials = await authenticateUser()
	return cowboyCredentials
}

// authenticate user and cache result locally
async function authenticateUser() {

	let authUrl = "https://app-api.cowboy.bike/auth/sign_in"
	req = new Request(authUrl)
	req.headers = {
		"Content-Type": "application/json"
	}
	req.method = "POST"
	req.body = JSON.stringify({ email, password })

	let result = await req.loadJSON()
	if (req.response.statusCode = 200) {
		// SUCCESS
		console.log(req.response.headers)
		const headers = req.response.headers

		const cowboyCredentials = { "accessToken": headers["Access-Token"], "expiry": headers["Expiry"], "client": headers["Client"], "uid": headers["Uid"], "bikeId": result.data.bike.id }
		let fm = FileManager.local()
		let dir = fm.documentsDirectory()
		let path = fm.joinPath(dir, "cowboy-credentials.json")
		fm.write(path, Data.fromString(JSON.stringify(cowboyCredentials)))
		return cowboyCredentials
	} else {
		// FAILED
		return null
	}
}

// helper function to check not empty strings
function isNotEmpty(stringToCheck) {
	if (stringToCheck != null && stringToCheck.length > 0) {
		return true
	} else {
		return false
	}
}
