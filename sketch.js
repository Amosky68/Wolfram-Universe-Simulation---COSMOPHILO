let univers;
let vertex_color;
let n = 15; // Taille de départ
let FieldTypes;

// --- VARIABLES D'INTERFACE ---
let ui_state = "config"; // "config" ou "running"
let selInitial, sliderSpeed, selMode, checkExpansion, checkTorus;
let btnStart, btnNext;

class vector2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  magnitude() { return sqrt(this.x * this.x + this.y * this.y); }
  sqmagnitude() { return this.x * this.x + this.y * this.y; }

  normalize() {
    let m = this.magnitude();
    if (m !== 0) { this.x /= m; this.y /= m; }
  }
  
  add(other_vector) { return new vector2(this.x + other_vector.x, this.y + other_vector.y); }
  sub(other_vector) { return new vector2(this.x - other_vector.x, this.y - other_vector.y); }
  mult(scalar) { return new vector2(this.x * scalar, this.y * scalar); }
  div(scalar) {
    if (scalar !== 0) return new vector2(this.x / scalar, this.y / scalar);
    return new vector2(0, 0); 
  }
}

class Node {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.edges = [];

    this.Fields = {};
    this.SourceFields = {};
    this.Next_Fields = {};
    this.Next_SourceFields = {};
    
    this.photon_dir = null;
    this.Next_photon_dir = null;
    
    this.createFields();
  }

  createFields() {
    for (const field_key in FieldTypes) {
      this.Fields[field_key] = 0;
      this.SourceFields[field_key] = 0;
      this.Next_Fields[field_key] = 0;
      this.Next_SourceFields[field_key] = 0;
    }
  }
}

class Graph {
  constructor(isTorus) {
    this.nodes = [];
    this.isTorus = isTorus; // L'univers sait s'il est bouclé ou non
  }

  addNode(id, x, y) {
    let newNode = new Node(id, x, y);
    this.nodes.push(newNode);
    return newNode;
  }

  addEdge(id1, id2) {
    if (!id1 || !id2) return; // Sécurité si le bord n'existe pas
    let node1 = this.nodes.find(n => n.id === id1);
    let node2 = this.nodes.find(n => n.id === id2);

    if (node1 && node2 && !node1.edges.includes(node2)) {
      node1.edges.push(node2);
      node2.edges.push(node1);
    }
  }
  
  addSource(x, y, field, amount) {
    let node = this.getnode(this.get_id_of_pos(x, y));
    if (node) { node.SourceFields[field] = amount; }
  }

  getnode(id1) { return this.nodes.find(n => n.id === id1); }

  wrap(val, max) {
    if (this.isTorus) return ((val % max) + max) % max;
    if (val < 0 || val >= max) return -1; // Mur invisible
    return val;
  }

  get_id_of_pos(x, y) {
    let wx = this.wrap(x, n);
    let wy = this.wrap(y, n);
    if (wx === -1 || wy === -1) return null; // En dehors de l'univers
    return `${wx},${wy}`;
  }

  Setup() {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        this.addNode(`${i},${j}`, i * 10, j * 10);
      }
    }
    this.buildEdges();
  }

  buildEdges() {
    for (let node of this.nodes) { node.edges = []; }
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let s = `${i},${j}`;
        this.addEdge(s, this.get_id_of_pos(i + 1, j));
        this.addEdge(s, this.get_id_of_pos(i - 1, j));
        this.addEdge(s, this.get_id_of_pos(i, j + 1));
        this.addEdge(s, this.get_id_of_pos(i, j - 1));
      }
    }
  }

  expandUniverse() {
    let old_n = n;
    n += 1; 

    for (let i = 0; i < n; i++) {
      if (i < old_n) {
        this.addNode(`${i},${old_n}`, i * 10, old_n * 10);
      } else {
        for (let j = 0; j < n; j++) {
          this.addNode(`${old_n},${j}`, old_n * 10, j * 10);
        }
      }
    }
    this.buildEdges();
  }

  make_big_bang() {
    let total_nodes = this.nodes.length;
    let half = Math.floor(total_nodes / 2);
    let energie = [];
    for (let i = 0; i < half; i++) { energie.push("charge+"); energie.push("charge-"); }
    if (total_nodes % 2 !== 0) { energie.push("photon"); }

    for (let i = energie.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [energie[i], energie[j]] = [energie[j], energie[i]];
    }

    for (let i = 0; i < total_nodes; i++) {
      let type = energie[i];
      let node = this.nodes[i];
      node.SourceFields[type] = 1;
      
      if (type === "photon") {
        let dirs = [new vector2(1, 0), new vector2(-1, 0), new vector2(0, 1), new vector2(0, -1)];
        node.photon_dir = dirs[Math.floor(Math.random() * dirs.length)];
      }
    }
  }

  get_gradient(field, node) {
    let i = Math.round(node.x / 10);
    let j = Math.round(node.y / 10);
    
    let n_up = this.getnode(this.get_id_of_pos(i, j - 1));
    let n_down = this.getnode(this.get_id_of_pos(i, j + 1));
    let n_left = this.getnode(this.get_id_of_pos(i - 1, j));
    let n_right = this.getnode(this.get_id_of_pos(i + 1, j));

    let v_up = n_up ? n_up.Fields[field] : node.Fields[field];
    let v_down = n_down ? n_down.Fields[field] : node.Fields[field];
    let v_left = n_left ? n_left.Fields[field] : node.Fields[field];
    let v_right = n_right ? n_right.Fields[field] : node.Fields[field];

    return new vector2((v_right - v_left) / 2, (v_down - v_up) / 2);
  }

  get_nodes_with_dir(direction, node) {
    let i = Math.round(node.x / 10);
    let j = Math.round(node.y / 10);
    let nodes = [];

    if (direction.x === 0) nodes.push(null);
    else if (direction.x > 0) nodes.push(this.getnode(this.get_id_of_pos(i + 1, j)));
    else nodes.push(this.getnode(this.get_id_of_pos(i - 1, j)));

    if (direction.y === 0) nodes.push(null);
    else if (direction.y > 0) nodes.push(this.getnode(this.get_id_of_pos(i, j + 1)));
    else nodes.push(this.getnode(this.get_id_of_pos(i, j - 1)));

    return nodes;
  }

  applyInterractions(fieldDestructionThreshold){
    for (let field in FieldTypes){
      for (let node of this.nodes){
        node.Fields[field]        = node.Next_Fields[field];
        node.SourceFields[field] += node.Next_SourceFields[field];

        if (Math.abs(node.SourceFields[field]) < fieldDestructionThreshold) node.SourceFields[field] = 0;
        if (Math.abs(node.Fields[field]) < fieldDestructionThreshold) node.Fields[field] = 0;
        
        node.Next_Fields[field]       = 0;
        node.Next_SourceFields[field] = 0;
      }
    }
    
    for (let node of this.nodes) {
      if (node.Next_photon_dir !== null) {
        node.photon_dir = node.Next_photon_dir;
        node.Next_photon_dir = null;
      } else if (node.SourceFields["photon"] === 0) {
        node.photon_dir = null;
      }
    }
  }
  
  diffuse_fields(contribution_factor, damping) {
    for (let node of this.nodes) {
      for (const field in FieldTypes) {
        let moyenne_autour = 0;
        if (node.edges.length > 0) {
          let somme = 0;
          for (let voisin of node.edges) somme += voisin.Fields[field];
          moyenne_autour = somme / node.edges.length;
        }
        node.Next_Fields[field] += (node.SourceFields[field] + moyenne_autour * contribution_factor) * damping;
      }
    }
  }
  
  update_charge_interraction() {
    let particules_pos = this.nodes.filter(n => n.SourceFields["charge+"] > 0);
    let particules_neg = this.nodes.filter(n => n.SourceFields["charge-"] > 0);

    let move_particle = (particule, target_field, my_field) => {
      let gradient = this.get_gradient(target_field, particule);
      let current_charge = particule.SourceFields[my_field];
      if (Math.abs(gradient.x) < 0.0001 && Math.abs(gradient.y) < 0.0001) return; 

      let nodes = this.get_nodes_with_dir(gradient, particule);
      let target_node = null;

      if (Math.abs(gradient.x) > Math.abs(gradient.y)) target_node = nodes[0];
      else target_node = nodes[1];

      if (!target_node && nodes[0]) target_node = nodes[0];
      if (!target_node && nodes[1]) target_node = nodes[1];

      if (target_node) {
        target_node.Next_SourceFields[my_field] += current_charge;
        particule.Next_SourceFields[my_field] -= current_charge;
      }
    };

    for (let particule of particules_pos) move_particle(particule, "charge-", "charge+");
    for (let particule of particules_neg) move_particle(particule, "charge+", "charge-");
  }
  
  handle_annihilation(photon_probability) {
    let particules_pos = this.nodes.filter(n => n.SourceFields["charge+"] > 0);
    for (let p_pos of particules_pos) {
      let q_plus = p_pos.SourceFields["charge+"];
      if (q_plus <= 0) continue; 

      let zone_recherche = [p_pos, ...p_pos.edges];
      let p_neg = zone_recherche.find(n => n.SourceFields["charge-"] > 0);

      if (p_neg) {
        let q_minus = p_neg.SourceFields["charge-"];
        let neutralise = Math.min(q_plus, q_minus);

        p_pos.SourceFields["charge+"] -= neutralise;
        p_neg.SourceFields["charge-"] -= neutralise;

        if (Math.random() < photon_probability) {
          p_pos.Next_SourceFields["photon"] += neutralise;
          let dirs = [new vector2(1, 0), new vector2(-1, 0), new vector2(0, 1), new vector2(0, -1)];
          p_pos.Next_photon_dir = dirs[Math.floor(Math.random() * dirs.length)];
        }
      }
    }
  }
  
  update_photons(destruction_probability) {
    let photon_nodes = this.nodes.filter(n => n.SourceFields["photon"] > 0 && n.photon_dir !== null);
    for (let node of photon_nodes) {
      let dir = node.photon_dir;
      let amount = node.SourceFields["photon"];
      let target_nodes = this.get_nodes_with_dir(dir, node);
      let next_node = (dir.x !== 0) ? target_nodes[0] : target_nodes[1];
      
      if (random() < destruction_probability) { next_node = null; } 

      if (next_node) {
        next_node.Next_SourceFields["photon"] += amount;
        next_node.Next_photon_dir = dir;
        node.Next_SourceFields["photon"] -= amount;
      } else {
        node.Next_SourceFields["photon"] -= amount;
      }
    }
  }
  
  quantum_fluctuations(probability, distance) {
    for (let node of this.nodes) {
      if (Math.random() < probability && node.edges.length > 0) {
        let voisin = node.edges[Math.floor(Math.random() * node.edges.length)];
        for (let i=0; i<distance-1; i++) {
          if (voisin.edges.length > 0) {
            voisin = voisin.edges[Math.floor(Math.random() * voisin.edges.length)];
          }
        }
        node.SourceFields["charge+"] += 1;
        voisin.SourceFields["charge-"] += 1;
      }
    }
  }
  
  computeInterractions(){
    this.quantum_fluctuations(0.00005, 10);
    this.handle_annihilation(0.9);  
    this.update_photons(0.015);        
    this.update_charge_interraction();
    
    this.diffuse_fields(1, 0.97);
    this.applyInterractions(0.0001);
    this.diffuse_fields(1, 0.97);
    this.applyInterractions(0.0001);
  }

  display() {
    stroke(100);
    strokeWeight(2);
    for (let node of this.nodes) {
      for (let connectedNode of node.edges) {
        let d = dist(node.x, node.y, connectedNode.x, connectedNode.y);
        if (d < 15) { line(node.x, node.y, connectedNode.x, connectedNode.y); }
      }
    }

    for (let node of this.nodes) {
      let charge_val = node.Fields["charge+"] - node.Fields["charge-"];
      let rouge = map(-sqrt(sqrt(-min(charge_val, 0))), -1, 0, 255, 50);
      let vert = map(sqrt(sqrt(max(charge_val, 0))), 0, 1, 50, 255);

      fill(rouge, vert, 50);
      if (node.SourceFields["photon"] !== 0) { fill(255, 255, 50); }
      noStroke();

      let hasSource = (node.SourceFields["charge+"] !== 0 || node.SourceFields["charge-"] !== 0 || node.SourceFields["photon"] !== 0);
      if (hasSource) {
        stroke(255); strokeWeight(1); circle(node.x, node.y, 8);
      } else {
        noStroke(); circle(node.x, node.y, 8);
      }
    }
  }
}

let zoom = 1.0;
let offsetX = 0;
let offsetY = 0;
let timestep = 0;
let physicsDelay = 0;
let frameRateDelay = 0;
let expansion_cooldown = 0;
let physics_Cooldown = 0;

function setup() {
  // On décale le canevas vers la droite pour faire de la place au menu HTML
  createCanvas(windowWidth - 260, windowHeight).position(260, 0);
  vertex_color = color(225, 100, 100);

  FieldTypes = {
    "photon": color(180, 180, 0),
    "charge+": color(225, 100, 100),
    "charge-": color(100, 225, 100),
  };
  
  setupUI();
}

function setupUI() {
  // On crée le conteneur principal et on lui assigne la classe CSS 'ui-panel'
  let panel = createDiv('').class('ui-panel');

  createDiv('<h2>Cosmologie Wolfram</h2>').parent(panel);

  createDiv('1. ÉTAT INITIAL').class('section-title').parent(panel);
  selInitial = createRadio();
  selInitial.option('Vide');
  selInitial.option('Big Bang');
  selInitial.selected('Big Bang');
  selInitial.parent(panel).style('display', 'flex').style('flex-direction', 'column').style('gap', '5px');

  createDiv('2. PARAMÈTRES PHYSIQUES').class('section-title').parent(panel);
  checkTorus = createCheckbox(' Univers Torique', true).parent(panel);
  checkExpansion = createCheckbox(' Expansion Spatiale', false).parent(panel);

  createDiv('3. CONTRÔLE DU TEMPS').class('section-title').parent(panel);
  selMode = createRadio();
  selMode.option('Auto');
  selMode.option('Manuel');
  selMode.selected('Auto');
  selMode.parent(panel).style('display', 'flex').style('flex-direction', 'column').style('gap', '5px');

  createDiv('<small style="color: #8A94A6;">Délai en mode auto :</small>').parent(panel);
  // Le slider prendra automatiquement le style moderne du CSS
  sliderSpeed = createSlider(1, 60, 5, 1).parent(panel);

  // On ajoute les classes pour les boutons stylisés
  btnStart = createButton('Démarrer / Reset').parent(panel).class('btn-primary').style('margin-top', '15px');
  btnStart.mousePressed(initSimulation);

  btnNext = createButton('Étape Suivante').parent(panel).class('btn-secondary');
  btnNext.mousePressed(doStep);
}

function initSimulation() {
  n = 15; // Remet l'univers à sa taille de base
  univers = new Graph(checkTorus.checked());
  univers.Setup();
  
  if (selInitial.value() === 'Big Bang') {
    univers.make_big_bang();
  }
  
  ui_state = "running";
  timestep = 0;
  expansion_cooldown = 0;
  
  // Recentrer la caméra
  offsetX = 0;
  offsetY = 0;
  zoom = min(width, height) / (n * 15); 
}

function doStep() {
  if (ui_state === "running") univers.computeInterractions();
}

function mouseDragged() {
  // Déplacer la vue uniquement si la souris est sur le canevas
  if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    offsetX += mouseX - pmouseX;
    offsetY += mouseY - pmouseY;
  }
}

function mouseWheel(event) {
  if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    zoom -= event.delta * 0.001;
    return false;
  }
}

function draw() {
  background(15);
  
  if (ui_state === "config") {
    fill(200); textAlign(CENTER); textSize(20);
    text("Paramétrez l'univers à gauche\npuis cliquez sur 'Démarrer / Reset'", width / 2, height / 2);
    return;
  }

  timestep++;
  expansion_cooldown++;
  
  // Moteur Physique
  if (selMode.value() === 'Auto') {
    physics_Cooldown += deltaTime;
    let delay = 1 / sliderSpeed.value();
    
    if (physics_Cooldown > delay * 1000) { univers.computeInterractions(); physics_Cooldown = 0;}
  }
  
  // Moteur d'expansion
  if (checkExpansion.checked() && expansion_cooldown >= (n * n * n / 500)) { 
    univers.expandUniverse(); 
    expansion_cooldown = 0;
  }

  // Rendu Visuel
  push();
  translate(width / 2 + offsetX, height / 2 + offsetY);
  scale(zoom);
  translate(-(n * 10) / 2, -(n * 10) / 2); // Centre l'univers dynamiquement
  univers.display();
  pop();

  draw_UI();
}

function draw_UI() {
  fill(255); noStroke(); textSize(14); textAlign(LEFT, TOP);

  frameRateDelay = 0.95 * frameRateDelay + frameRate() * 0.05;
  let currentFPS = Math.round(frameRateDelay);

  text("Âge de l'univers (Frames) : " + timestep, 20, 20);
  text("Taille du maillage : " + n + "x" + n, 20, 40);
  text("FPS : " + currentFPS, 20, 60);

  let nbParticules = univers.nodes.filter(n => 
    n.SourceFields["charge+"] !== 0 || n.SourceFields["charge-"] !== 0 || n.SourceFields["photon"] !== 0
  ).length;

  text("Particules : " + nbParticules, 20, 80);
}