import React from 'react';

class Message extends React.Component {
	render() {
		return (
			<article className='message is-danger' style={{marginTop: '20px', textAlign: 'center'}}>
				<div className='message-body'>{this.props.content}</div>
			</article>
		);
	}
}

export default Message;
