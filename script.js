var canvas = $("#renderCanvas").get(0);
var engine = new BABYLON.Engine(canvas, true);
var scene = new BABYLON.Scene(engine);
var vZero = new BABYLON.Vector3(0,0,0);
scene.ambientColor = new BABYLON.Color3(0.25, 0.45, 0);

//initialize game variables
var game = {
	lights : [/*all lights pushed here*/],
	objects: [/*all objects (physics imposter + meshes) pushed here*/],
	shadowGenerators: [/*all shadow generators pushed here*/],
	outline: {
		enabled: true,
		width: 0.1,
		color: BABYLON.Color3.Black(),
	},
	debugMode: true,
};
//initialize player variable
var velo = [vZero, vZero];
var player = {
	body: BABYLON.Mesh.CreateSphere("playerSphere", 3, 5, scene),
	camera: new BABYLON.ArcRotateCamera("Camera", 0, 0, 50, null, scene),
	moveSpeed: 250,//speed to add every frame while key held
	jumpHeight: 200,
	maxVelocity: 500,
	angDamping: 0.65,
	linDamping: 0.65,
	movement: {
		forward: false,
		back: false,
		left: false,
		right: false,
		jumping: false,
	},
	velocity: undefined,
};

//initialize physics environment
var gravity = new BABYLON.Vector3(0, -100, 0);
//scene.enablePhysics(gravity, new BABYLON.AmmoJSPlugin()); /*Uncaught TypeError: this.bjsAMMO.btSoftBodyRigidBodyCollisionConfiguration is not a constructor*/
scene.enablePhysics(gravity, new BABYLON.CannonJSPlugin());
//scene.enablePhysics(gravity, new BABYLON.OimoJSPlugin());
scene.getPhysicsEngine().setTimeStep(1/6);

//variables
var rotateVec2 = function(v, q){
	var matrix = new BABYLON.Matrix();
	q.toRotationMatrix(matrix);
	var rotatedvect = BABYLON.Vector2.Transform(v, matrix);
	return rotatedvect;
};
var clampRadian = function(radianValue) {
	var cyclesNumber;
	if (radianValue < (-2 * Math.PI) || radianValue > (2 * Math.PI)) {
		if (radianValue >= 0) {
			cyclesNumber = Math.floor(radianValue / (2 * Math.PI));
		} else {
			cyclesNumber = Math.ceil(radianValue / (2 * Math.PI));
		}
		radianValue = radianValue - (cyclesNumber * (2 * Math.PI));
	}
	return radianValue;
};
var clampVector = function(vector3) {
	return BABYLON.Vector3.FromArray([
		clampRadian(vector3.x),
		clampRadian(vector3.y),
		clampRadian(vector3.z),
	]);
};
var addMaterial = function(mesh, diffuseCol, specularCol, emissiveCol, ambientCol){
	var myMaterial = new BABYLON.StandardMaterial("myMaterial", scene);
	myMaterial.diffuseColor = diffuseCol;
	if(specularCol !== undefined){
		myMaterial.specularColor = specularCol;
	}
	if(emissiveCol !== undefined){
		myMaterial.emissiveColor = emissiveCol;
	}
	if(ambientCol !== undefined){
		myMaterial.ambientColor = ambientCol;
	}
	mesh.material = myMaterial;
};
var newColor = function(color){return new BABYLON.Color3.FromHexString(color);};
var teleportTo = function(pos, mesh){
	mesh.position = pos;
	mesh.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(0,0,0));
	mesh.physicsImpostor.setAngularVelocity(new BABYLON.Vector3(0,0,0));
};

var initializePlayer = function(spawnPos){
	player.camera.attachControl(canvas, true);
	player.camera.setTarget(player.body);
	
	player.body.physicsImpostor = new BABYLON.PhysicsImpostor(player.body, BABYLON.PhysicsImpostor.SphereImpostor,{mass: 2.5, friction: 0.5, restitution: 0.5}, scene);
	player.body.physicsImpostor.physicsBody.linearDamping = player.linDamping;
	player.body.physicsImpostor.physicsBody.angularDamping = player.angDamping;
	player.body.position.y = 30;
	addMaterial(player.body, newColor("#1896d3"));
	game.objects.push(player.body);
	player.body.renderOutline = game.outline.enabled;
 player.body.outlineWidth = game.outline.width;
 player.body.outlineColor = game.outline.color;
};
var renderLights = function(){
	//spawn light inside scene
	var light = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(0,-1,0), scene);
	light.position = new BABYLON.Vector3(200, 500, 100);
	light.rotation = new BABYLON.Vector3(Math.PI/2,0,1);
	light.intensity = 0.25;
	light.range = 10000;
	
	var light2 = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
	light2.intensity = 0.25;

	//enable shadows
	var shadowGenerator = new BABYLON.ShadowGenerator(512*2, light);
	shadowGenerator.addShadowCaster(player.body);
	shadowGenerator.usePercentageCloserFiltering = true;
	game.shadowGenerators.push(shadowGenerator);
};
var renderLevel = function(){

	//show velocity helper
	player.velocity = BABYLON.MeshBuilder.CreateLines("velo", {points: velo, updatable: true});

	//draw axis helper
	var showAxis = function(size) {
		var makeTextPlane = function(text, color, size) {
			var dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", 50, scene, true);
			dynamicTexture.hasAlpha = true;
			dynamicTexture.drawText(text, 5, 40, "bold 36px Arial", color , "transparent", true);
			var plane = new BABYLON.Mesh.CreatePlane("TextPlane", size, scene, true);
			plane.material = new BABYLON.StandardMaterial("TextPlaneMaterial", scene);
			plane.material.backFaceCulling = false;
			plane.material.specularColor = new BABYLON.Color3(0, 0, 0);
			plane.material.diffuseTexture = dynamicTexture;
			return plane;
		};

		var axisX = BABYLON.Mesh.CreateLines("axisX", [ 
			new BABYLON.Vector3.Zero(), new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0.05 * size, 0), 
			new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, -0.05 * size, 0)
		], scene);
		axisX.color = new BABYLON.Color3(1, 0, 0);
		var xChar = makeTextPlane("X", "red", size / 10);
		xChar.position = new BABYLON.Vector3(0.9 * size, -0.05 * size, 0);
		var axisY = BABYLON.Mesh.CreateLines("axisY", [
			new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( -0.05 * size, size * 0.95, 0), 
			new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( 0.05 * size, size * 0.95, 0)
		], scene);
		axisY.color = new BABYLON.Color3(0, 1, 0);
		var yChar = makeTextPlane("Y", "green", size / 10);
		yChar.position = new BABYLON.Vector3(0, 0.9 * size, -0.05 * size);
		var axisZ = BABYLON.Mesh.CreateLines("axisZ", [
			new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0 , -0.05 * size, size * 0.95),
			new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0, 0.05 * size, size * 0.95)
		], scene);
		axisZ.color = new BABYLON.Color3(0, 0, 1);
		var zChar = makeTextPlane("Z", "blue", size / 10);
		zChar.position = new BABYLON.Vector3(0, 0.05 * size, 0.9 * size);
	};
	showAxis(10);

	//create teleport barrier
	var ground = BABYLON.MeshBuilder.CreateBox("deathzone", {width: 10000, height: 1, depth: 10000}, scene);
	ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.75, restitution: 0.3 }, scene);
	ground.position.y = -100;
	addMaterial(ground, newColor("#ff8888"));
	game.objects.push(ground);
	ground.receiveShadows = true;
	//create starting platform
	var start = BABYLON.MeshBuilder.CreateBox("startzone", {width: 5000, height: 5, depth: 5000}, scene);
	start.physicsImpostor = new BABYLON.PhysicsImpostor(start, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.75, restitution: 0.3 }, scene);
	addMaterial(start, newColor("#88ff88"));
	start.receiveShadows = true;
	game.objects.push(start);

	/*
	//create random obstacles
	function getRandomColor() {var letters = '0123456789ABCDEF', color = '#';for (var i = 0; i < 6; i++) {color += letters[Math.floor(Math.random() * 16)];}return color;}
	var obstacleCount = 400, obRange = [250, 250, 250], obSizeRange = [[1,10],[1,1],[1,10]];
	for(var i=0;i<obstacleCount;i++){
		var curObstCol = newColor(getRandomColor());
		var randSizeX = obSizeRange[0][0] + (Math.random() * (obSizeRange[0][1]-obSizeRange[0][0]));
		var randSizeY = obSizeRange[1][0] + (Math.random() * (obSizeRange[1][1]-obSizeRange[1][0]));
		var randSizeZ = obSizeRange[2][0] + (Math.random() * (obSizeRange[2][1]-obSizeRange[2][0]));
		//console.log(randSizeX);
		var curObst = BABYLON.MeshBuilder.CreateBox("obst_"+i, {width: randSizeX, height: randSizeY, depth: randSizeZ}, scene);
		var curObx = Math.random() * obRange[0], curOby = Math.random() * obRange[1], curObz = Math.random() * obRange[2];
		curObst.physicsImpostor = new BABYLON.PhysicsImpostor(curObst, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, friction: 0.75, restitution: 0.3 }, scene);
		curObst.position = new BABYLON.Vector3(curObx - (obRange[0]/2), curOby, curObz - (obRange[2]/2));
		addMaterial(curObst, curObstCol);
		game.shadowGenerators[0].addShadowCaster(curObst);
		curObst.receiveShadows = true;
		game.objects.push(curObst);
	}
	*/
	BABYLON.SceneLoader.ImportMeshAsync("", "https://raw.github.com/Isabwella/3d-platformer/main/", "test_level.glb", scene);
};

initializePlayer();
renderLights();
renderLevel();

//enable player movement
window.addEventListener("keyup", function(e){
	if(e.key == "w" || e.key == "a" || e.key == "s" || e.key == "d"){
		if(e.key == "w"){
			player.movement.forward = false;
		}else if(e.key == "s"){
			player.movement.back = false;
		}else if(e.key == "a"){
			player.movement.left = false;
		}else if(e.key == "d"){
			player.movement.right = false;
		}
	}
	if(e.key == " "){
		player.movement.jumping = false;
	}
});
window.addEventListener("keydown", function(e){
	var curKey = e.key.toLowerCase();
	if (e.repeat) {return;}
	//console.log(typeof e.key);
	if(curKey == "w" || curKey == "a" || curKey == "s" || curKey == "d"){
		var body = player.body.physicsImpostor, bodyPos = player.body.getAbsolutePosition();
		if(curKey == "w"){
			player.movement.forward = true;
		}else if(curKey == "s"){
			player.movement.back = true;
		}else if(curKey == "a"){
			player.movement.left = true;
		}else if(curKey == "d"){
			player.movement.right = true;
		}
	}
	if(e.key == "Tab"){
		scene.debugLayer.show();
	}
	if(e.key == " "){
		player.movement.jumping = true;
		var ray = new BABYLON.Ray(player.body.position, (new BABYLON.Vector3(0,-1,0)).normalize(), 100);
		var playerSize = Math.abs(player.body.getBoundingInfo().boundingSphere.minimum.y);
		var collisionPadding = playerSize/10;//arbitrary tollerance to allow jumping on slanted surfaces better
		var hit = scene.pickWithRay(ray, function(item){
			if(item === player.body){return false;}
			return true;
		});
		//console.log(hit.distance);
		if(hit.distance <= playerSize + collisionPadding){
			//console.log("jumping!");
			var body = player.body.physicsImpostor, bodyPos = player.body.position;
			var jumpHeight = new BABYLON.Vector3(0,1,0).scale(player.jumpHeight);
			body.applyImpulse(jumpHeight,bodyPos);
		}
	}else{
		console.log(e.key);
	}
});

engine.runRenderLoop(function() {
	//teleport player when they hit a death barrier
	if(player.body.intersectsMesh(scene.getMeshByID("deathzone"))){
		teleportTo(new BABYLON.Vector3(0,30,0), player.body);
	}

	var playerSpeed = player.body.getPhysicsImpostor().getLinearVelocity();
	velo[0] = vZero;
	velo[1] = playerSpeed.scale(0.5);
	player.velocity = BABYLON.MeshBuilder.CreateLines("velo", {points: velo, instance: player.velocity});
	player.velocity.position = player.body.position;

	//player movement code
	if(player.movement.forward || player.movement.back || player.movement.left || player.movement.right){
		var camXY = new BABYLON.Vector3(player.camera.position.x, player.body.position.y, player.camera.position.z);
		var forward = player.body.position.subtract(camXY).normalize();
		var backwards = new BABYLON.Vector3(-forward.x, -forward.y, -forward.z);
		var Lcam = new BABYLON.ArcRotateCamera("leftcam", player.camera.alpha+(Math.PI/2), player.camera.beta, player.camera.radius, player.body, scene, false);
		var LcamXY = new BABYLON.Vector3(Lcam.position.x, player.body.position.y, Lcam.position.z);
		var Rcam = new BABYLON.ArcRotateCamera("rightcam", player.camera.alpha-(Math.PI/2), player.camera.beta, player.camera.radius, player.body, scene, false);
		var RcamXY = new BABYLON.Vector3(Rcam.position.x, player.body.position.y, Rcam.position.z);
		//console.log(RcamXY);
		var playerSpeed = player.body.getPhysicsImpostor().getLinearVelocity();
		var getRawVelocity = (Math.abs(playerSpeed.x) + Math.abs(playerSpeed.z))/2;
		var clampedVelo = getRawVelocity>player.maxVelocity?player.maxVelocity:getRawVelocity;
		var diminishSpeed = ((player.maxVelocity - clampedVelo)/player.maxVelocity);
		var leftOrRight = player.movement.left || player.movement.right;
		var forwardOrBack = player.movement.forward || player.movement.back;
		var diagonalDampening = 0.67;
		
		var movementVec = new BABYLON.Vector3();
		
		if(player.movement.forward && !player.movement.back){
			player.body.physicsImpostor.applyForce(forward.scale(player.moveSpeed*diminishSpeed).scale(leftOrRight?diagonalDampening:1), player.body.getAbsolutePosition());
		}
		if(player.movement.back && !player.movement.forward){
			player.body.physicsImpostor.applyForce(backwards.scale(player.moveSpeed*diminishSpeed).scale(leftOrRight?diagonalDampening:1), player.body.getAbsolutePosition());
		}
		if(player.movement.left && !player.movement.right){
			player.body.physicsImpostor.applyForce((player.body.position.subtract(LcamXY).normalize()).scale(player.moveSpeed*diminishSpeed).scale(forwardOrBack?diagonalDampening:1), player.body.getAbsolutePosition());
		}
		if(player.movement.right && !player.movement.left){
			player.body.physicsImpostor.applyForce((player.body.position.subtract(RcamXY).normalize()).scale(player.moveSpeed*diminishSpeed).scale(forwardOrBack?diagonalDampening:1), player.body.getAbsolutePosition());
		}
		//player.body.physicsImpostor.applyForce((player.body.position.subtract(movementVec).normalize()).scale(player.moveSpeed*diminishSpeed), player.body.getAbsolutePosition());
	}

	//update UI elements
	var getRawVelocity = ((Math.abs(playerSpeed.x) + Math.abs(playerSpeed.z))/2).toFixed(2);
	var pX = player.body.position.x, pY = player.body.position.y, pZ = player.body.position.z;
	$(".debug .speed").text("Speed: "+getRawVelocity);
	$(".debug .pos").text("Position: "+pX.toFixed(2)+"x "+pY.toFixed(2)+"y "+pZ.toFixed(2)+"z");

	scene.render();
});

window.addEventListener("resize", function() {engine.resize();});
canvas.addEventListener("click", function(e) {
	canvas.requestPointerLock = canvas.requestPointerLock || canvas.msRequestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
	if(canvas.requestPointerLock){canvas.requestPointerLock();}
	if(e.button == 0){
		console.log("left clicked!");
	}else if(e.button == 2){
		console.log("right clicked!");
	}
}, false);