using MediatR;

namespace sagacitysolutions.com.portal.Application.Common.Messaging;

public interface ICommand : IRequest {}

public interface ICommand<out TResponse> : IRequest<TResponse> {}
