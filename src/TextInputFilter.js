import React from 'react';

class TextInputFilter extends React.Component {
	constructor(props) {
		super(props);
		this.state = {value: props.value};
	}

	componentWillReceiveProps(nextProps) {
		this.setState((prevState, props) => {
			return {value: nextProps.value};
		});
	}

	handleChange(event) {
		const value = event.target.value;
		this.setState((prevState, props) => {
			return {value: value};
		});
	}

	handleSubmit() {
		this.props.onSubmit(this.state.value);
	}

	render() {
		return (
			<div style={{marginBottom: '15px'}}>
				<label className='label'>{this.props.title}</label>
				<div className='field has-addons'>
					<div className='control'>
						<input className='input' type='text' value={this.state.value} onChange={this.handleChange.bind(this)} />
					</div>
					<div className='control'>
						<button className='button is-info' onClick={this.handleSubmit.bind(this)}>
							Submit
						</button>
					</div>
				</div>
			</div>
		);
	}
}

export default TextInputFilter;
