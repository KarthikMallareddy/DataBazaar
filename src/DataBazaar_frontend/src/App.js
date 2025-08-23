import { html, render } from 'lit-html';
import { backend as DataBazaar_backend, createActor } from 'declarations/backend';
import logo from './logo2.svg';

class App {
  greeting = '';

  constructor() {
    this.#render();
  }

  #handleSubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    if (DataBazaar_backend) {
      this.greeting = await DataBazaar_backend.get_data(Number(name));
    } else {
      // fallback to creating an actor if backend is undefined
      const actor = createActor(process.env.CANISTER_ID_BACKEND);
      this.greeting = await actor.get_data(Number(name));
    }
    this.#render();
  };

  #render() {
    let body = html`
      <main>
        <img src="${logo}" alt="DFINITY logo" />
        <br />
        <br />
        <form action="#">
          <label for="name">Enter your name: &nbsp;</label>
          <input id="name" alt="Name" type="text" />
          <button type="submit">Click Me!</button>
        </form>
        <section id="greeting">${this.greeting}</section>
      </main>
    `;
    render(body, document.getElementById('root'));
    document
      .querySelector('form')
      .addEventListener('submit', this.#handleSubmit);
  }
}

export default App;
